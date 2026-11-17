module Sdkwork
  module AppSdk
    module Models
      class IamUserPersonaUpdateCommand
              # Full persona replacement; omitted interests mean an empty list.
              attr_accessor :role, :interests, :prompt_dismissed

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @role = attributes['role']
                @interests = attributes['interests'].is_a?(Array) ? attributes['interests'].map { |item| item } : []
                @prompt_dismissed = attributes['promptDismissed']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'role' => @role,
                  'interests' => @interests.is_a?(Array) ? @interests.map { |item| item } : [],
                  'promptDismissed' => @prompt_dismissed,
                }
              end
            end
    end
  end
end
