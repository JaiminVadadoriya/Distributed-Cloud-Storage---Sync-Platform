resource "aws_opensearch_domain" "search" {
  domain_name    = "cloudstorage-search-${var.environment}"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type  = "t3.medium.search"
    instance_count = 1
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 20
  }

  tags = {
    Environment = var.environment
    Service     = "CloudStorage"
  }
}
