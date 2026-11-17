module Sdkwork
  module AppSdk
    module Models
      class OauthPhoneBindingVerificationCodeRequestCommand
              # Requests the ownership-proof SMS code for a pending OAuth account association. Unlike `auth/verification_code_requests` the caller is not yet authenticated; the pending-binding ticket is the authorization.
              attr_accessor :continuation_token, :phone

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @continuation_token = attributes['continuationToken']
                @phone = attributes['phone']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'continuationToken' => @continuation_token,
                  'phone' => @phone,
                }
              end
            end
    end
  end
end
