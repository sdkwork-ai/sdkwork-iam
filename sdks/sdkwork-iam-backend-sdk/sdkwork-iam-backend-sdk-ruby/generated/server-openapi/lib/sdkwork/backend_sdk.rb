require_relative 'sdkwork/backend_sdk/version'
require_relative 'sdkwork/backend_sdk/sdk_config'
require_relative 'sdkwork/backend_sdk/models/sdk_work_api_response'
require_relative 'sdkwork/backend_sdk/models/sdk_work_resource_data'
require_relative 'sdkwork/backend_sdk/models/sdk_work_page_data'
require_relative 'sdkwork/backend_sdk/models/sdk_work_command_data'
require_relative 'sdkwork/backend_sdk/models/page_info'
require_relative 'sdkwork/backend_sdk/models/problem_detail'
require_relative 'sdkwork/backend_sdk/models/field_error'
require_relative 'sdkwork/backend_sdk/models/sdk_work_resource_response'
require_relative 'sdkwork/backend_sdk/models/sdk_work_list_response'
require_relative 'sdkwork/backend_sdk/models/sdk_work_command_response'
require_relative 'sdkwork/backend_sdk/models/iam_oauth_client_create_command'
require_relative 'sdkwork/backend_sdk/models/appbase_application_register_command'
require_relative 'sdkwork/backend_sdk/models/iam_tenant_application_management_provision_command'
require_relative 'sdkwork/backend_sdk/models/iam_tenant_application_management_update_command'
require_relative 'sdkwork/backend_sdk/models/iam_tenant_application_status_command'
require_relative 'sdkwork/backend_sdk/models/appbase_tenant_application_provision_command'
require_relative 'sdkwork/backend_sdk/models/appbase_tenant_application_update_command'
require_relative 'sdkwork/backend_sdk/models/appbase_tenant_application_enable_command'
require_relative 'sdkwork/backend_sdk/models/appbase_access_credential_create_command'
require_relative 'sdkwork/backend_sdk/models/service_account_credential_create_command'
require_relative 'sdkwork/backend_sdk/models/service_account_credential_revoke_command'
require_relative 'sdkwork/backend_sdk/models/service_account_token_exchange_command'
require_relative 'sdkwork/backend_sdk/http/client'
require_relative 'sdkwork/backend_sdk/api/base_api'
require_relative 'sdkwork/backend_sdk/api/iam'
require_relative 'sdkwork/backend_sdk/api/iam_oauth'
require_relative 'sdkwork/backend_sdk/client'

module Sdkwork
  module BackendSdk
    def self.create_client(config = SdkConfig.new)
      SdkworkBackendClient.new(config)
    end
  end
end
