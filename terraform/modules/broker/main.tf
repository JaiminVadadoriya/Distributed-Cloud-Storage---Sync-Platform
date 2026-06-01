variable "environment" {
  type        = string
  description = "Deployment environment"
}

# AWS MQ RabbitMQ Broker (conditional)
resource "aws_mq_broker" "rabbitmq" {
  count              = var.environment == "aws" || var.environment == "production" ? 1 : 0
  broker_name        = "cloudstorage-broker-${var.environment}"
  engine_type        = "RabbitMQ"
  engine_version     = "3.10.8"
  host_instance_type = "mq.t3.micro"

  user {
    username = "mqadmin"
    password = "SuperSecretMQPassword123!" # In real scenarios use secrets manager
  }

  tags = {
    Environment = var.environment
    Service     = "CloudStorage"
  }
}
