use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DesktopSessionsCreateResponse201 {
    pub code: i64,

    #[serde(rename = "traceId")]
    pub trace_id: String,

    pub data: serde_json::Value,
}
