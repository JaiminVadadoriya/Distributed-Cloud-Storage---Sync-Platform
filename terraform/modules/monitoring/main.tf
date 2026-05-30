variable "environment" {
  type        = string
  description = "Deployment environment"
}

# Example AWS CloudWatch log group for logs ingestion (conditional)
resource "aws_cloudwatch_log_group" "api_logs" {
  count             = var.environment == "aws" || var.environment == "production" ? 1 : 0
  name              = "/cloudstorage/api-${var.environment}"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Service     = "CloudStorage"
  }
}

# CloudWatch Dashboard for storage engine monitoring
resource "aws_cloudwatch_dashboard" "storage_dashboard" {
  count          = var.environment == "aws" || var.environment == "production" ? 1 : 0
  dashboard_name = "CloudStorage-Dashboard-${var.environment}"

  dashboard_body = <<EOF
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          [ "AWS/S3", "NumberOfObjects", "BucketName", "cloudstorage-chunks-${var.environment}" ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "S3 Objects Count"
      }
    }
  ]
}
EOF
}
