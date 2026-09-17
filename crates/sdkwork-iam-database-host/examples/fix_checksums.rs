#[tokio::main]
async fn main() {
    use sqlx::Row;
    // The checksum dump is produced by another run, so its location is supplied
    // by the operator instead of being baked into the example.
    let checksums_path = std::env::args().nth(1).unwrap_or_else(|| {
        eprintln!("usage: fix_checksums <org-id-checksums.json>");
        std::process::exit(2);
    });
    let map: serde_json::Map<String, serde_json::Value> = serde_json::from_str(
        &std::fs::read_to_string(&checksums_path).expect("read checksums json"),
    )
    .expect("parse checksums json");
    let pool = sdkwork_database_sqlx::create_pool_from_env("")
        .await
        .expect("create pool")
        .expect("pool");
    let sdkwork_database_sqlx::DatabasePool::Postgres(pg, _) = &pool else {
        panic!("expected postgres");
    };
    for (key, checksum) in &map {
        let Some((module, version)) = key.split_once('|') else {
            continue;
        };
        let checksum = checksum.as_str().expect("checksum string");
        let before: Option<String> = sqlx::query_scalar(
            "SELECT checksum FROM ops_schema_migration_history \
             WHERE module_id = $1 AND version = $2 AND engine = 'postgres'",
        )
        .bind(module)
        .bind(version)
        .fetch_optional(&*pg)
        .await
        .expect("query checksum");
        let Some(before) = before else {
            println!("{module}/{version}: NOT APPLIED, skipping");
            continue;
        };
        if before == checksum {
            println!("{module}/{version}: already current");
            continue;
        }
        sqlx::query(
            "UPDATE ops_schema_migration_history SET checksum = $3 \
             WHERE module_id = $1 AND version = $2 AND engine = 'postgres'",
        )
        .bind(module)
        .bind(version)
        .bind(checksum)
        .execute(&*pg)
        .await
        .expect("update checksum");
        println!("{module}/{version}: {before:.16}... -> {checksum:.16}...");
    }
}
