resource "google_cloud_scheduler_job" "sync-collection-valuation" {
  schedule         = "*/15 * * * *"
  name             = "sync-collection-valuation-job-trigger-${local.env}"
  attempt_deadline = "900s"
  retry_config { retry_count = 1 }
  http_target {
    http_method = "POST"
    uri         = "https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/677718976504/jobs/sync-collection-valuation-job-${local.env}:run"
    oauth_token { service_account_email = "677718976504-compute@developer.gserviceaccount.com" }
  }
}

resource "google_cloud_scheduler_job" "sync-eth-value-usd" {
  schedule         = "* * * * *"
  name             = "sync-eth-value-usd-job-${local.env}"
  attempt_deadline = "30s"
  retry_config { retry_count = 1 }
  http_target {
    http_method = "POST"
    uri         = "https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/677718976504/jobs/sync-eth-value-usd-job-${local.env}:run"
    oauth_token { service_account_email = "677718976504-compute@developer.gserviceaccount.com" }
  }
}

resource "google_cloud_scheduler_job" "sync-merkle-tree-state" {
  schedule         = "*/5 * * * *"
  name             = "sync-merkle-tree-state-job-trigger-${local.env}"
  attempt_deadline = "300s"
  retry_config { retry_count = 1 }
  http_target {
    http_method = "POST"
    uri         = "https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/677718976504/jobs/sync-merkle-tree-state-job-${local.env}:run"
    oauth_token { service_account_email = "677718976504-compute@developer.gserviceaccount.com" }
  }
}

resource "google_cloud_scheduler_job" "sync-merkle-tree" {
  schedule         = "0 8 * * 5"
  name             = "sync-merkle-tree-job-trigger-${local.env}"
  description      = "Sync merkle tree trigger"
  attempt_deadline = "1800s"
  retry_config { retry_count = 1 }
  http_target {
    http_method = "POST"
    uri         = "https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/677718976504/jobs/sync-merkle-tree-job-${local.env}:run"
    oauth_token { service_account_email = "677718976504-compute@developer.gserviceaccount.com" }
  }
}

resource "google_cloud_scheduler_job" "sync-pine-value-usd" {
  schedule         = "* * * * *"
  name             = "sync-pine-value-usd-job-${local.env}"
  attempt_deadline = "30s"
  retry_config { retry_count = 1 }
  http_target {
    http_method = "POST"
    uri         = "https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/677718976504/jobs/sync-pine-value-usd-job-${local.env}:run"
    oauth_token { service_account_email = "677718976504-compute@developer.gserviceaccount.com" }
  }
}

resource "google_cloud_scheduler_job" "sync-pools" {
  schedule         = "*/5 * * * *"
  name             = "sync-pools-job-trigger-${local.env}"
  attempt_deadline = "300s"
  retry_config { retry_count = 1 }
  http_target {
    http_method = "POST"
    uri         = "https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/677718976504/jobs/sync-pools-job-${local.env}:run"
    oauth_token { service_account_email = "677718976504-compute@developer.gserviceaccount.com" }
  }
}

resource "google_cloud_scheduler_job" "sync-snapshots" {
  schedule         = "0 * * * *"
  name             = "sync-snapshots-job-trigger-${local.env}"
  attempt_deadline = "1800s"
  retry_config { retry_count = 1 }
  http_target {
    http_method = "POST"
    uri         = "https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/677718976504/jobs/sync-snapshots-job-${local.env}:run"
    oauth_token { service_account_email = "677718976504-compute@developer.gserviceaccount.com" }
  }
}

# resource "google_cloud_scheduler_job" "sync-bid-orders" {
#   schedule         = "*/5 * * * *"
#   name             = "sync-bid-orders-job-trigger-${local.env}"
#   attempt_deadline = "300s"
#   retry_config { retry_count = 1 }
#   http_target {
#     http_method = "POST"
#     uri         = "https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/677718976504/jobs/sync-bid-orders-job-${local.env}:run"
#     oauth_token { service_account_email = "677718976504-compute@developer.gserviceaccount.com" }
#   }
# }

# resource "google_cloud_scheduler_job" "sync-users" {
#   schedule         = "*/30 * * * *"
#   name             = "sync-users-job-trigger-${local.env}"
#   attempt_deadline = "1800s"
#   retry_config { retry_count = 1 }
#   http_target {
#     http_method = "POST"
#     uri         = "https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/677718976504/jobs/sync-users-job-${local.env}:run"
#     oauth_token { service_account_email = "677718976504-compute@developer.gserviceaccount.com" }
#   }
# }