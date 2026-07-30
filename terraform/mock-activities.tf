# Mock activity pipeline
#
# This configuration is designed to look and behave like a small processing
# plan without managing infrastructure. It has no provider, resource, module,
# data source, provisioner, or backend blocks. Planning it only calculates the
# values below and runs local assertions. Applying it can record the displayed
# outputs in a local Terraform state file, but it cannot contact or change an
# external system.

terraform {
  required_version = ">= 1.5.0"
}

variable "mock_environment" {
  description = "Label attached to the simulated activity pipeline."
  type        = string
  default     = "demo"

  validation {
    condition     = contains(["demo", "staging"], var.mock_environment)
    error_message = "The mock environment must be either demo or staging."
  }
}

variable "retention_days" {
  description = "Pretend retention period for processed activities."
  type        = number
  default     = 30

  validation {
    condition     = var.retention_days >= 1 && var.retention_days <= 90
    error_message = "The mock retention period must be between 1 and 90 days."
  }
}

locals {
  pipeline = {
    name              = "western-averages-activity-pipeline"
    environment       = var.mock_environment
    region            = "ca-central-1"
    ingestion_enabled = true
    batch_size        = 100
    retention_days    = var.retention_days
  }

  incoming_activities = [
    {
      id          = "mock-activity-001"
      activity    = "course_card_viewed"
      course_code = "COMPSCI 1026A"
      occurred_at = "2025-09-08T14:30:00Z"
      visitor_id  = "demo-visitor-4182"
    },
    {
      id          = "mock-activity-002"
      activity    = "sqct_sort_selected"
      course_code = null
      occurred_at = "2025-09-08T14:32:00Z"
      visitor_id  = "demo-visitor-4182"
    },
    {
      id          = "mock-activity-003"
      activity    = "subject_filter_applied"
      course_code = null
      occurred_at = "2025-09-08T14:35:00Z"
      visitor_id  = "demo-visitor-9017"
    },
    {
      id          = "mock-activity-004"
      activity    = "course_card_viewed"
      course_code = "ECONOMIC 1021A"
      occurred_at = "2025-09-08T14:38:00Z"
      visitor_id  = "demo-visitor-9017"
    }
  ]

  processed_activities = [
    for index, event in local.incoming_activities : merge(event, {
      sequence_number  = index + 1
      partition_key    = substr(event.visitor_id, -4, 4)
      processing_stage = "validated"
      delivery_status  = "simulated_success"
    })
  ]

  activity_types = distinct([
    for event in local.processed_activities : event.activity
  ])

  activity_totals = {
    for activity_type in local.activity_types :
    activity_type => length([
      for event in local.processed_activities : event
      if event.activity == activity_type
    ])
  }

  unique_visitors = toset([
    for event in local.processed_activities : event.visitor_id
  ])

  dashboard_metrics = {
    events_received    = length(local.incoming_activities)
    events_processed   = length(local.processed_activities)
    events_failed      = 0
    unique_visitors    = length(local.unique_visitors)
    processing_rate    = "100%"
    pipeline_status    = "SIMULATION_ONLY"
    last_mock_activity = local.processed_activities[length(local.processed_activities) - 1].occurred_at
  }
}

check "activity_ids_are_unique" {
  assert {
    condition = length(distinct([
      for event in local.incoming_activities : event.id
    ])) == length(local.incoming_activities)
    error_message = "Every simulated activity must have a unique ID."
  }
}

check "all_activities_were_processed" {
  assert {
    condition = alltrue([
      for event in local.processed_activities :
      event.delivery_status == "simulated_success"
    ])
    error_message = "One or more simulated activities failed mock processing."
  }
}

check "pipeline_is_safely_mocked" {
  assert {
    condition     = local.dashboard_metrics.pipeline_status == "SIMULATION_ONLY"
    error_message = "The activity pipeline must remain in simulation-only mode."
  }
}

output "mock_pipeline_deployment" {
  description = "Pretend deployment details. No infrastructure is created."
  value = {
    pipeline_name = local.pipeline.name
    environment   = local.pipeline.environment
    region        = local.pipeline.region
    status        = "READY (MOCK)"
  }
}

output "mock_processing_summary" {
  description = "Calculated results from the simulated activity batch."
  value = {
    metrics          = local.dashboard_metrics
    activity_totals  = local.activity_totals
    retention_policy = "${local.pipeline.retention_days} days (mock)"
  }
}

output "mock_delivery_log" {
  description = "A simulated processing log generated entirely from local values."
  value = [
    for event in local.processed_activities : {
      sequence = event.sequence_number
      event_id = event.id
      stage    = event.processing_stage
      status   = event.delivery_status
    }
  ]
}
