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

# resource "google_cloud_scheduler_job" "syncPools" {
#   name             = "core-service-sync-pools-${local.env}"
#   description      = "Sync pool trigger"
#   schedule         = "*/5 * * * *"
#   attempt_deadline = "300s"

#   retry_config { retry_count = 1 }

#   http_target {
#     http_method = "GET"
#     uri         = "https://core-service-${local.env}.pine.loans/jobs/sync-pools"
#   }
# }

# resource "google_cloud_scheduler_job" "syncBidOrders" {
#   name             = "core-service-sync-bid-orders-${local.env}"
#   description      = "Sync bidOrders trigger"
#   schedule         = "*/5 * * * *"
#   attempt_deadline = "300s"

#   retry_config { retry_count = 1 }

#   http_target {
#     http_method = "GET"
#     uri         = "https://core-service-${local.env}.pine.loans/jobs/sync-bid-orders"
#   }
# }

# resource "google_cloud_scheduler_job" "syncUsers" {
#   name             = "core-service-sync-users-${local.env}"
#   description      = "Sync users trigger"
#   schedule         = "*/30 * * * *"
#   attempt_deadline = "1800s"

#   retry_config { retry_count = 1 }

#   http_target {
#     http_method = "GET"
#     uri         = "https://core-service-${local.env}.pine.loans/jobs/sync-users"
#   }
# }

# resource "google_cloud_scheduler_job" "syncEthValueUSD" {
#   name             = "core-service-sync-eth-valud-usd-${local.env}"
#   description      = "Sync eth usd price trigger"
#   schedule         = "* * * * *"
#   attempt_deadline = "30s"

#   retry_config { retry_count = 1 }

#   http_target {
#     http_method = "GET"
#     uri         = "https://core-service-${local.env}.pine.loans/jobs/sync-eth-value-usd"
#   }
# }

# resource "google_cloud_scheduler_job" "syncPineValueUSD" {
#   name             = "core-service-sync-pine-value-usd-${local.env}"
#   description      = "Sync pine usd price trigger"
#   schedule         = "* * * * *"
#   attempt_deadline = "30s"

#   retry_config { retry_count = 1 }

#   http_target {
#     http_method = "GET"
#     uri         = "https://core-service-${local.env}.pine.loans/jobs/sync-pine-value-usd"
#   }
# }

# resource "google_cloud_scheduler_job" "syncCollectionValuation" {
#   name             = "core-service-sync-collection-valuation-${local.env}"
#   description      = "Sync collection valuation trigger"
#   schedule         = "*/15 * * * *"
#   attempt_deadline = "900s"

#   retry_config { retry_count = 1 }

#   http_target {
#     http_method = "GET"
#     uri         = "https://core-service-${local.env}.pine.loans/jobs/sync-collection-valuation"
#   }
# }

# resource "google_cloud_scheduler_job" "syncSnapshots" {
#   name             = "core-service-sync-snapshots-${local.env}"
#   description      = "Sync snapshots trigger"
#   schedule         = "0 * * * *"
#   attempt_deadline = "1800s"

#   retry_config { retry_count = 1 }

#   http_target {
#     http_method = "GET"
#     uri         = "https://core-service-${local.env}.pine.loans/jobs/sync-snapshots"
#   }
# }

# resource "google_cloud_scheduler_job" "syncMerkleTree" {
#   name             = "core-service-sync-merkle-tree-${local.env}"
#   description      = "Sync merkle tree trigger"
#   schedule         = "0 8 * * 5"
#   attempt_deadline = "1800s"

#   retry_config { retry_count = 1 }

#   http_target {
#     http_method = "GET"
#     uri         = "https://core-service-${local.env}.pine.loans/jobs/sync-merkle-tree"
#   }
# }

resource "google_cloud_scheduler_job" "syncMerkleTreeState" {
  name             = "core-service-sync-merkle-tree-state-${local.env}"
  description      = "Sync merkle tree state trigger"
  schedule         = "*/5 * * * *"
  attempt_deadline = "300s"

  retry_config { retry_count = 1 }

  http_target {
    http_method = "GET"
    uri         = "https://core-service-${local.env}.pine.loans/jobs/sync-merkle-tree-state"
  }
}