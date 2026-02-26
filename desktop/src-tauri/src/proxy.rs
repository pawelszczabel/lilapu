use std::collections::HashMap;

/// Proxy a request to an external URL without sending the WebView's Origin header.
/// This is needed because Clerk's custom-domain FAPI rejects requests whose
/// Origin is not *.lilapu.com, and Tauri's WebView sends tauri://localhost.
#[tauri::command]
pub async fn proxy_request(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<ProxyResponse, String> {
    let client = reqwest::Client::new();

    let mut req = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "PATCH" => client.patch(&url),
        "DELETE" => client.delete(&url),
        _ => return Err(format!("Unsupported method: {}", method)),
    };

    // Forward headers (except Origin — that's the whole point)
    for (key, value) in &headers {
        let k = key.to_lowercase();
        if k != "origin" && k != "referer" {
            req = req.header(key.as_str(), value.as_str());
        }
    }

    if let Some(b) = body {
        req = req.body(b);
    }

    let resp = req.send().await.map_err(|e| format!("Request failed: {}", e))?;

    let status = resp.status().as_u16();
    let resp_headers: HashMap<String, String> = resp
        .headers()
        .iter()
        .filter_map(|(k, v)| {
            v.to_str().ok().map(|val| (k.to_string(), val.to_string()))
        })
        .collect();
    let resp_body = resp.text().await.map_err(|e| format!("Body read failed: {}", e))?;

    Ok(ProxyResponse {
        status,
        headers: resp_headers,
        body: resp_body,
    })
}

#[derive(serde::Serialize)]
pub struct ProxyResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
}
