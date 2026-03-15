using System;
using System.Net.Mail;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly ILogger<EmailService> _logger;
        private readonly IConfiguration _configuration;

        public EmailService(ILogger<EmailService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string resetToken)
        {
            var resetUrl = _configuration["PasswordReset:ResetUrl"] ?? "http://localhost:4200/auth/reset-password";
            var resetLink = $"{resetUrl}?token={Uri.EscapeDataString(resetToken)}";

            _logger.LogInformation(
                "=== PASSWORD RESET EMAIL ===\n" +
                "To: {Email}\n" +
                "Reset Link: {ResetLink}\n" +
                "============================",
                toEmail, resetLink);

            var host = _configuration["Smtp:Host"];
            var portString = _configuration["Smtp:Port"];
            
            if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(portString) || !int.TryParse(portString, out int port))
            {
                _logger.LogWarning("SMTP Configuration missing or invalid. Skipping actual email dispatch.");
                return;
            }

            var fromAddress = _configuration["Smtp:FromAddress"] ?? "noreply@cloudstorage.local";
            var fromName = _configuration["Smtp:FromName"] ?? "Cloud Storage Local";

            try
            {
                using var client = new SmtpClient(host, port);
                
                var mailMessage = new MailMessage
                {
                    From = new MailAddress(fromAddress, fromName),
                    Subject = "Cloud Storage - Password Reset",
                    Body = $@"
                        <h2>Password Reset Request</h2>
                        <p>We received a request to reset your password.</p>
                        <p>Click the link below to set a new password:</p>
                        <p><a href='{resetLink}'>{resetLink}</a></p>
                        <p>This link will expire in exactly 1 hour.</p>
                        <p>If you did not request a password reset, please ignore this email.</p>
                    ",
                    IsBodyHtml = true
                };

                mailMessage.To.Add(toEmail);

                await client.SendMailAsync(mailMessage);
                _logger.LogInformation("Successfully dispatched email via SMTP {Host}:{Port}", host, port);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email via SMTP.");
            }
        }
    }
}
