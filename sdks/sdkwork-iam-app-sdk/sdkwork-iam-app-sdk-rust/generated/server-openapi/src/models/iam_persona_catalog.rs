use serde::{Deserialize, Serialize};

use crate::models::{IamPersonaInterest, IamPersonaRole};

/// The selectable persona taxonomy with every active locale.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IamPersonaCatalog {
    /// Opaque catalog version; refresh the cached catalog when it changes.
    pub version: String,

    pub roles: Vec<IamPersonaRole>,

    pub interests: Vec<IamPersonaInterest>,
}
