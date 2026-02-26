fn main() {
    // The screencapturekit crate uses Swift concurrency (ScreenCaptureKit).
    // We need to add the Swift runtime library path so the binary can find
    // libswift_Concurrency.dylib at runtime.
    #[cfg(target_os = "macos")]
    {
        println!("cargo:rustc-link-arg=-Wl,-rpath,/usr/lib/swift");
        // Also add the Xcode toolchain Swift lib path for CI environments
        if let Ok(output) = std::process::Command::new("xcrun")
            .args(["--toolchain", "default", "--find", "swiftc"])
            .output()
        {
            if output.status.success() {
                let swiftc_path = String::from_utf8_lossy(&output.stdout);
                if let Some(toolchain_dir) = std::path::Path::new(swiftc_path.trim())
                    .parent()
                    .and_then(|p| p.parent())
                {
                    let swift_lib = toolchain_dir.join("lib").join("swift").join("macosx");
                    if swift_lib.exists() {
                        println!(
                            "cargo:rustc-link-arg=-Wl,-rpath,{}",
                            swift_lib.display()
                        );
                    }
                }
            }
        }
    }

    tauri_build::build()
}
