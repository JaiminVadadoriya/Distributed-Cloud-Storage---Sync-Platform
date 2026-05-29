variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region for resources"
}

variable "gcp_project" {
  type        = string
  default     = "cloud-storage-project"
  description = "GCP Project ID"
}

variable "gcp_region" {
  type        = string
  default     = "us-central1"
  description = "GCP region for resources"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Deployment environment (dev, staging, production, aws, azure)"
}
