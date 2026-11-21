module Sdkwork
  module BackendSdk
    module Models
      class IamInstallationManagementProvisionCommand
              # Provision a tenant installation from the deploy application it serves plus explicit attributes, through an authenticated operator workflow. Application templates are retired, so no template reference is accepted.
              attr_accessor :organization_id, :instance_key, :display_name, :environment, :application_type, :primary_domain, :access_permissions, :runtime_config, :deploy_application_id, :ownership_scope, :owner_user_id, :provisioning_idempotency_key

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @organization_id = attributes['organizationId']
                @instance_key = attributes['instanceKey']
                @display_name = attributes['displayName']
                @environment = attributes['environment']
                @application_type = attributes['applicationType']
                @primary_domain = attributes['primaryDomain']
                @access_permissions = attributes['accessPermissions'].is_a?(Array) ? attributes['accessPermissions'].map { |item| item } : []
                @runtime_config = attributes['runtimeConfig'].is_a?(Hash) ? attributes['runtimeConfig'] : {}
                @deploy_application_id = attributes['deployApplicationId']
                @ownership_scope = attributes['ownershipScope']
                @owner_user_id = attributes['ownerUserId']
                @provisioning_idempotency_key = attributes['provisioningIdempotencyKey']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'organizationId' => @organization_id,
                  'instanceKey' => @instance_key,
                  'displayName' => @display_name,
                  'environment' => @environment,
                  'applicationType' => @application_type,
                  'primaryDomain' => @primary_domain,
                  'accessPermissions' => @access_permissions.is_a?(Array) ? @access_permissions.map { |item| item } : [],
                  'runtimeConfig' => @runtime_config,
                  'deployApplicationId' => @deploy_application_id,
                  'ownershipScope' => @ownership_scope,
                  'ownerUserId' => @owner_user_id,
                  'provisioningIdempotencyKey' => @provisioning_idempotency_key,
                }
              end
            end
    end
  end
end
