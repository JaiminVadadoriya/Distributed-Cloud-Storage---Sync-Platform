using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Transactions;

namespace CloudStorage.Infrastructure.Transactions
{
    public class SagaOrchestrator : ISagaOrchestrator
    {
        private static readonly ConcurrentDictionary<string, SagaTransaction> Transactions = new();
        private static readonly ConcurrentDictionary<string, string> IdempotencyRegistry = new(); // key -> txId
        
        // Storing execution closures mapping to TransactionId -> list of (execute, compensate)
        private static readonly ConcurrentDictionary<string, List<(string Name, Func<Task> Execute, Func<Task> Compensate)>> StepClosures = new();

        public Task<SagaTransaction> BeginSagaAsync(string name, string idempotencyKey)
        {
            if (IdempotencyRegistry.TryGetValue(idempotencyKey, out var existingTxId))
            {
                if (Transactions.TryGetValue(existingTxId, out var existingTx))
                {
                    return Task.FromResult(existingTx);
                }
            }

            var transactionId = Guid.NewGuid().ToString();
            var transaction = new SagaTransaction(
                TransactionId: transactionId,
                Name: name,
                Steps: new List<SagaStep>(),
                IsCompleted: false,
                IsCompensated: false,
                IdempotencyKey: idempotencyKey
            );

            Transactions[transactionId] = transaction;
            IdempotencyRegistry[idempotencyKey] = transactionId;
            StepClosures[transactionId] = new List<(string, Func<Task>, Func<Task>)>();

            return Task.FromResult(transaction);
        }

        public Task<SagaTransaction> AddStepAsync(string transactionId, string stepName, Func<Task> execute, Func<Task> compensate)
        {
            if (!Transactions.TryGetValue(transactionId, out var tx))
            {
                throw new KeyNotFoundException($"Transaction {transactionId} not found");
            }

            var closures = StepClosures.GetOrAdd(transactionId, _ => new List<(string, Func<Task>, Func<Task>)>());
            closures.Add((stepName, execute, compensate));

            var steps = tx.Steps.ToList();
            steps.Add(new SagaStep(
                StepId: Guid.NewGuid().ToString(),
                Name: stepName,
                State: SagaStepState.Pending,
                Error: null
            ));

            var updated = tx with { Steps = steps };
            Transactions[transactionId] = updated;

            return Task.FromResult(updated);
        }

        public async Task<SagaTransaction> ExecuteAsync(string transactionId)
        {
            if (!Transactions.TryGetValue(transactionId, out var tx))
            {
                throw new KeyNotFoundException($"Transaction {transactionId} not found");
            }

            if (!StepClosures.TryGetValue(transactionId, out var closures))
            {
                return tx;
            }

            var steps = tx.Steps.ToList();
            int failedIndex = -1;
            string? failureError = null;

            for (int i = 0; i < closures.Count; i++)
            {
                var closure = closures[i];
                var step = steps[i];

                steps[i] = step with { State = SagaStepState.Executing };
                Transactions[transactionId] = tx with { Steps = steps };

                try
                {
                    await closure.Execute();
                    steps[i] = step with { State = SagaStepState.Completed };
                    Transactions[transactionId] = tx with { Steps = steps };
                }
                catch (Exception ex)
                {
                    failedIndex = i;
                    failureError = ex.Message;
                    steps[i] = step with { State = SagaStepState.Failed, Error = ex.Message };
                    Transactions[transactionId] = tx with { Steps = steps };
                    break;
                }
            }

            if (failedIndex != -1)
            {
                // Compensate previously completed steps in reverse order
                for (int i = failedIndex - 1; i >= 0; i--)
                {
                    var closure = closures[i];
                    var step = steps[i];

                    steps[i] = step with { State = SagaStepState.Compensating };
                    Transactions[transactionId] = tx with { Steps = steps };

                    try
                    {
                        await closure.Compensate();
                        steps[i] = step with { State = SagaStepState.Compensated };
                        Transactions[transactionId] = tx with { Steps = steps };
                    }
                    catch (Exception compEx)
                    {
                        steps[i] = step with { State = SagaStepState.Failed, Error = $"Compensation failed: {compEx.Message}" };
                        Transactions[transactionId] = tx with { Steps = steps };
                    }
                }

                var finalCompensated = tx with { Steps = steps, IsCompleted = true, IsCompensated = true };
                Transactions[transactionId] = finalCompensated;
                return finalCompensated;
            }

            var finalCompleted = tx with { Steps = steps, IsCompleted = true, IsCompensated = false };
            Transactions[transactionId] = finalCompleted;
            return finalCompleted;
        }

        public Task<SagaTransaction?> GetTransactionAsync(string transactionId)
        {
            if (Transactions.TryGetValue(transactionId, out var tx))
            {
                return Task.FromResult<SagaTransaction?>(tx);
            }
            return Task.FromResult<SagaTransaction?>(null);
        }
    }
}
