output "lambda_function_name" {
  description = "OAuth Lambda function name"
  value       = aws_lambda_function.oauth.function_name
}
