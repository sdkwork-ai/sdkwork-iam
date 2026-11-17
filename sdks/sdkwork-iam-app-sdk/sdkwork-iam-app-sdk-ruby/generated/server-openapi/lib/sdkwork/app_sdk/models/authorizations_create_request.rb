module Sdkwork
  module AppSdk
    module Models
      class AuthorizationsCreateRequest
              attr_accessor :client_id, :response_type, :redirect_uri, :scope, :state, :code_challenge, :code_challenge_method, :tenant_id

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @client_id = attributes['clientId']
                @response_type = attributes['responseType']
                @redirect_uri = attributes['redirectUri']
                @scope = attributes['scope']
                @state = attributes['state']
                @code_challenge = attributes['codeChallenge']
                @code_challenge_method = attributes['codeChallengeMethod']
                @tenant_id = attributes['tenantId']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'clientId' => @client_id,
                  'responseType' => @response_type,
                  'redirectUri' => @redirect_uri,
                  'scope' => @scope,
                  'state' => @state,
                  'codeChallenge' => @code_challenge,
                  'codeChallengeMethod' => @code_challenge_method,
                  'tenantId' => @tenant_id,
                }
              end
            end
    end
  end
end
