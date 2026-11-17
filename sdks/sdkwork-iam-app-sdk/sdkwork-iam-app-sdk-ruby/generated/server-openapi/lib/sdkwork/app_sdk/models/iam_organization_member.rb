module Sdkwork
  module AppSdk
    module Models
      class IamOrganizationMember
              # One member of an organization roster as IAM publishes it.
              attr_accessor :user_id, :membership_id, :display_name, :username, :email, :membership_kind, :status, :is_primary

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @user_id = attributes['userId']
                @membership_id = attributes['membershipId']
                @display_name = attributes['displayName']
                @username = attributes['username']
                @email = attributes['email']
                @membership_kind = attributes['membershipKind']
                @status = attributes['status']
                @is_primary = attributes['isPrimary']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'userId' => @user_id,
                  'membershipId' => @membership_id,
                  'displayName' => @display_name,
                  'username' => @username,
                  'email' => @email,
                  'membershipKind' => @membership_kind,
                  'status' => @status,
                  'isPrimary' => @is_primary,
                }
              end
            end
    end
  end
end
