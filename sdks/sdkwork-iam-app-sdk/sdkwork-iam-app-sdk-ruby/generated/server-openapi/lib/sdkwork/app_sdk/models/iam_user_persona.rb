module Sdkwork
  module AppSdk
    module Models
      class IamUserPersona
              # The caller persona. role is null until a role is chosen.
              attr_accessor :role, :interests, :prompt_dismissed, :has_selection, :catalog_version, :updated_at

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @role = attributes['role']
                @interests = attributes['interests'].is_a?(Array) ? attributes['interests'].map { |item| item } : []
                @prompt_dismissed = attributes['promptDismissed']
                @has_selection = attributes['hasSelection']
                @catalog_version = attributes['catalogVersion']
                @updated_at = attributes['updatedAt']
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
                  'hasSelection' => @has_selection,
                  'catalogVersion' => @catalog_version,
                  'updatedAt' => @updated_at,
                }
              end
            end
    end
  end
end
