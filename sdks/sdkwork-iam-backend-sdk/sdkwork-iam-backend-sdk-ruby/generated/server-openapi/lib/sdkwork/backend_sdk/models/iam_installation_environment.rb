module Sdkwork
  module BackendSdk
    module Models
      class IamInstallationEnvironment
              # One lifecycle environment registered for an installation.
              attr_accessor :environment_id, :tenant_id, :organization_id, :installation_id, :environment_key, :primary_domain, :domain_config, :status, :created_at, :updated_at

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @environment_id = attributes['environmentId']
                @tenant_id = attributes['tenantId']
                @organization_id = attributes['organizationId']
                @installation_id = attributes['installationId']
                @environment_key = attributes['environmentKey']
                @primary_domain = attributes['primaryDomain']
                @domain_config = attributes['domainConfig'].is_a?(Hash) ? attributes['domainConfig'] : {}
                @status = attributes['status']
                @created_at = attributes['createdAt']
                @updated_at = attributes['updatedAt']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'environmentId' => @environment_id,
                  'tenantId' => @tenant_id,
                  'organizationId' => @organization_id,
                  'installationId' => @installation_id,
                  'environmentKey' => @environment_key,
                  'primaryDomain' => @primary_domain,
                  'domainConfig' => @domain_config,
                  'status' => @status,
                  'createdAt' => @created_at,
                  'updatedAt' => @updated_at,
                }
              end
            end
    end
  end
end
