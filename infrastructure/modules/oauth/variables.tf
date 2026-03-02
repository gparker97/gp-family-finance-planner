variable "app_name" {
  description = "Application name"
  type        = string
}

variable "environment" {
  description = "Environment name (prod, dev)"
  type        = string
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
}

variable "api_gateway_id" {
  description = "ID of the shared API Gateway HTTP API (from registry module)"
  type        = string
}

variable "api_gateway_execution_arn" {
  description = "Execution ARN of the shared API Gateway (from registry module)"
  type        = string
}

variable "cors_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
  default     = ["https://beanies.family", "http://localhost:5173"]
}
