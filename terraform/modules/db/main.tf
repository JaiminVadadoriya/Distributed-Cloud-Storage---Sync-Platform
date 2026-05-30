variable "environment" {
  type        = string
  description = "Deployment environment"
}

# AWS RDS PostgreSQL Instance (conditional)
resource "aws_db_instance" "postgres" {
  count                  = var.environment == "aws" || var.environment == "production" ? 1 : 0
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t4g.micro"
  db_name                = "cloudstorage"
  username               = "dbadmin"
  password               = "SuperSecretPassword123!" # In real scenarios use secrets manager
  parameter_group_name   = "default.postgres15"
  skip_final_snapshot    = true

  tags = {
    Environment = var.environment
    Service     = "CloudStorage"
  }
}
