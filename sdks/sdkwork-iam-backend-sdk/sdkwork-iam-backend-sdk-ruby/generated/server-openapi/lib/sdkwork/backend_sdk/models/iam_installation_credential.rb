module Sdkwork
  module BackendSdk
    module Models
      class IamInstallationCredential
              # OAuth client metadata of one installation environment. The secret is write-only and is returned only by create/rotate.
              attr_accessor :credential_id, :tenant_id, :installation_environment_id, :environment_key, :client_id, :redirect_uris, :granted_scopes, :status, :rotated_at, :retired_at, :created_at, :updated_at

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @credential_id = attributes['credentialId']
                @tenant_id = attributes['tenantId']
                @installation_environment_id = attributes['installationEnvironmentId']
                @environment_key = attributes['environmentKey']
                @client_id = attributes['clientId']
                @redirect_uris = attributes['redirectUris'].is_a?(Array) ? attributes['redirectUris'].map { |item| item } : []
                @granted_scopes = attributes['grantedScopes'].is_a?(Array) ? attributes['grantedScopes'].map { |item| item } : []
                @status = attributes['status']
                @rotated_at = attributes['rotatedAt']
                @retired_at = attributes['retiredAt']
                @created_at = attributes['createdAt']
                @updated_at = attributes['updatedAt']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'credentialId' => @credential_id,
                  'tenantId' => @tenant_id,
                  'installationEnvironmentId' => @installation_environment_id,
                  'environmentKey' => @environment_key,
                  'clientId' => @client_id,
                  'redirectUris' => @redirect_uris.is_a?(Array) ? @redirect_uris.map { |item| item } : [],
                  'grantedScopes' => @granted_scopes.is_a?(Array) ? @granted_scopes.map { |item| item } : [],
                  'status' => @status,
                  'rotatedAt' => @rotated_at,
                  'retiredAt' => @retired_at,
                  'createdAt' => @created_at,
                  'updatedAt' => @updated_at,
                }
              end
            end
    end
  end
end
