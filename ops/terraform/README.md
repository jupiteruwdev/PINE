# Cronjobs configs for environments

### How to add a new job for environment

1. Choose environment directory. (e.g. for `prod` it will be `ops/terraform/prod`)
2. Open `jobs.tf` file in that directory
3. Copy-paste existing job and update the endpoint
  Config reference doc: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_scheduler_job
4. Changes will be deployed the same way as a regular service deployment, on merging into the `development`, `staging` or `main` branches, that will deploy changes on related environment.

Link to Cloud Scheduler panel:
https://console.cloud.google.com/cloudscheduler?referrer=search&project=pinedefi

Reference:
https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_scheduler_job
