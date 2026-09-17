module Sdkwork
  module BackendSdk
    module Models
      class IamTenantApplicationManagementProvisionCommand
              # Provision a registered application template for a tenant through an authenticated operator workflow.
              attr_accessor :organization_id, :template_id, :app_key, :instance_key, :display_name, :environment, :application_type, :primary_domain, :access_permissions

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @organization_id = attributes['organizationId']
                @template_id = attributes['templateId']
                @app_key = attributes['appKey']
                @instance_key = attributes['instanceKey']
                @display_name = attributes['displayName']
                @environment = attributes['environment']
                @application_type = attributes['applicationType']
                @primary_domain = attributes['primaryDomain']
                @access_permissions = attributes['accessPermissions'].is_a?(Array) ? attributes['accessPermissions'].map { |item| item } : []
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'organizationId' => @organization_id,
                  'templateId' => @template_id,
                  'appKey' => @app_key,
                  'instanceKey' => @instance_key,
                  'displayName' => @display_name,
                  'environment' => @environment,
                  'applicationType' => @application_type,
                  'primaryDomain' => @primary_domain,
                  'accessPermissions' => @access_permissions.is_a?(Array) ? @access_permissions.map { |item| item } : [],
                }
              end
            end
    end
  end
end
