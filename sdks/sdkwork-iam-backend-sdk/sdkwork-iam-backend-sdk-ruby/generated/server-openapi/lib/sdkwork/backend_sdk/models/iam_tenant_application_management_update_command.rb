module Sdkwork
  module BackendSdk
    module Models
      class IamTenantApplicationManagementUpdateCommand
              # Update operator-managed tenant application domain and access permissions.
              attr_accessor :primary_domain, :access_permissions

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @primary_domain = attributes['primaryDomain']
                @access_permissions = attributes['accessPermissions'].is_a?(Array) ? attributes['accessPermissions'].map { |item| item } : []
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'primaryDomain' => @primary_domain,
                  'accessPermissions' => @access_permissions.is_a?(Array) ? @access_permissions.map { |item| item } : [],
                }
              end
            end
    end
  end
end
