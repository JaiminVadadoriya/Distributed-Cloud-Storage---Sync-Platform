variable "environment" {
  type        = string
  description = "Deployment environment"
}

# AWS ElastiCache Redis Cluster (conditional)
resource "aws_elasticache_cluster" "redis" {
  count                = var.environment == "aws" || var.environment == "production" ? 1 : 0
  cluster_id           = "cloudstorage-cache-${var.environment}"
  engine               = "redis"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7.x"
  port                 = 6379

  tags = {
    Environment = var.environment
    Service     = "CloudStorage"
  }
}
