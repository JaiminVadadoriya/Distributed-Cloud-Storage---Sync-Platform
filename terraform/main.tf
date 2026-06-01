module "storage_aws" {
  count         = var.environment == "aws" || var.environment == "production" ? 1 : 0
  source        = "./modules/storage"
  provider_type = "s3"
  bucket_name   = "cloudstorage-chunks-${var.environment}"
  environment   = var.environment
}

module "storage_azure" {
  count         = var.environment == "azure" || var.environment == "production" ? 1 : 0
  source        = "./modules/storage"
  provider_type = "blob"
  bucket_name   = "cloudstoragechunks${var.environment}"
  environment   = var.environment
}

module "database" {
  source      = "./modules/db"
  environment = var.environment
}

module "cache" {
  source      = "./modules/cache"
  environment = var.environment
}

module "message_broker" {
  source      = "./modules/broker"
  environment = var.environment
}

module "monitoring" {
  source      = "./modules/monitoring"
  environment = var.environment
}

module "search" {
  source      = "./modules/search"
  environment = var.environment
}
