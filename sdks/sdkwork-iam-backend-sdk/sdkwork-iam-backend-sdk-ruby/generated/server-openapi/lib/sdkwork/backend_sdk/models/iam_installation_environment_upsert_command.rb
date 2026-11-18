module Sdkwork
  module BackendSdk
    module Models
      class IamInstallationEnvironmentUpsertCommand
              # Idempotent registration of one environment. The path environmentKey is authoritative; an explicit body value must match it. Omitted status keeps the stored status on update and defaults to pending on insert.
              attr_accessor :environment_key, :primary_domain, :domain_config, :status

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @environment_key = attributes['environmentKey']
                @primary_domain = attributes['primaryDomain']
                @domain_config = attributes['domainConfig'].is_a?(Hash) ? attributes['domainConfig'] : {}
                @status = attributes['status']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'environmentKey' => @environment_key,
                  'primaryDomain' => @primary_domain,
                  'domainConfig' => @domain_config,
                  'status' => @status,
                }
              end
            end
    end
  end
end
