variable "provider_type" {
  type        = string
  description = "s3 or blob"
}

variable "bucket_name" {
  type        = string
  description = "Name of bucket or storage account"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
}

# AWS S3 Bucket
resource "aws_s3_bucket" "chunks" {
  count  = var.provider_type == "s3" ? 1 : 0
  bucket = var.bucket_name

  tags = {
    Environment = var.environment
    Service     = "CloudStorage"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "s3_sse" {
  count  = var.provider_type == "s3" ? 1 : 0
  bucket = aws_s3_bucket.chunks[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Azure Blob Storage
resource "azurerm_resource_group" "rg" {
  count    = var.provider_type == "blob" ? 1 : 0
  name     = "rg-cloudstorage-${var.environment}"
  location = "East US"
}

resource "azurerm_storage_account" "sa" {
  count                    = var.provider_type == "blob" ? 1 : 0
  name                     = var.bucket_name
  resource_group_name      = azurerm_resource_group.rg[0].name
  location                 = azurerm_resource_group.rg[0].location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = {
    environment = var.environment
  }
}

resource "azurerm_storage_container" "container" {
  count                 = var.provider_type == "blob" ? 1 : 0
  name                  = "chunks"
  storage_account_name  = azurerm_storage_account.sa[0].name
  container_access_type = "private"
}
