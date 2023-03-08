resource "google_cloud_scheduler_job" "job" {
  name             = "core-service-version-${local.env}"
  description      = "Test HTTP version trigger"
  schedule         = "* * * * *"
  attempt_deadline = "320s"

  retry_config { retry_count = 1 }

  http_target {
    http_method = "GET"
    uri         = "https://core-service-${local.env}.pine.loans/version"
  }
}

resource "google_cloud_scheduler_job" "syncPools" {
  name             = "core-service-version-${local.env}"
  description      = "Sync pool trigger"
  schedule         = "* * * * *"
  attempt_deadline = "320s"

  retry_config { retry_count = 1 }

  http_target {
    http_method = "GET"
    uri         = "https://core-service-${local.env}.pine.loans/version"
  }
}