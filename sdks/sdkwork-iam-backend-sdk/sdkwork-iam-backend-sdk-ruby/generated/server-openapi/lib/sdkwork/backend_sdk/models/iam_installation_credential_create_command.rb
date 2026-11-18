module Sdkwork
  module BackendSdk
    module Models
      class IamInstallationCredentialCreateCommand
              # Creates the OAuth client of one environment. Omitted clientId is generated.
              attr_accessor :environment_key, :client_id, :redirect_uris, :granted_scopes

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @environment_key = attributes['environmentKey']
                @client_id = attributes['clientId']
                @redirect_uris = attributes['redirectUris'].is_a?(Array) ? attributes['redirectUris'].map { |item| item } : []
                @granted_scopes = attributes['grantedScopes'].is_a?(Array) ? attributes['grantedScopes'].map { |item| item } : []
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'environmentKey' => @environment_key,
                  'clientId' => @client_id,
                  'redirectUris' => @redirect_uris.is_a?(Array) ? @redirect_uris.map { |item| item } : [],
                  'grantedScopes' => @granted_scopes.is_a?(Array) ? @granted_scopes.map { |item| item } : [],
                }
              end
            end
    end
  end
end
