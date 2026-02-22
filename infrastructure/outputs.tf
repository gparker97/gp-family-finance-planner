# ── Frontend outputs ──────────────────────────────────────────────────────────

output "s3_bucket_name" {
  description = "S3 bucket for frontend assets"
  value       = module.frontend.s3_bucket_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.frontend.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.frontend.cloudfront_domain_name
}

output "website_url" {
  description = "Website URL"
  value       = "https://${var.domain_name}"
}

