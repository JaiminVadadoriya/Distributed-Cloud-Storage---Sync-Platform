using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Transactions
{
    public enum SagaStepState { Pending, Executing, Completed, Compensating, Compensated, Failed }
    public record SagaStep(string StepId, string Name, SagaStepState State, string? Error);
    public record SagaTransaction(string TransactionId, string Name, IReadOnlyList<SagaStep> Steps, 
        bool IsCompleted, bool IsCompensated, string IdempotencyKey);

    public interface ISagaOrchestrator
    {
        Task<SagaTransaction> BeginSagaAsync(string name, string idempotencyKey);
        Task<SagaTransaction> AddStepAsync(string transactionId, string stepName, Func<Task> execute, Func<Task> compensate);
        Task<SagaTransaction> ExecuteAsync(string transactionId);
        Task<SagaTransaction?> GetTransactionAsync(string transactionId);
    }
}
