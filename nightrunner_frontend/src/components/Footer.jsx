import "./Footer.css";

export default function Footer() {
    const version =
        import.meta.env.VITE_APP_VERSION || "v0.10.9-80";

    const releaseVersion =
        version.match(/^v?\d+\.\d+\.\d+/)?.[0];

    const releaseUrl = releaseVersion
        ? `https://github.com/TLNightOps/NightRunner/releases/tag/${releaseVersion}`
        : "https://github.com/TLNightOps/NightRunner/releases";

    return (
        <footer className="app-footer">
            <div className="app-footer-content">
                <span>
                    Created by GA-0594
                </span>

                <span className="app-footer-separator">
                    •
                </span>

                <a
                    href="https://github.com/TLNightOps"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    TLNightOps on GitHub
                </a>

                <span className="app-footer-separator">
                    •
                </span>

                <a
                    href={releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Night Runner {version}
                </a>

                <span className="app-footer-separator">
                    •
                </span>

                <a
                    href="https://nightopsadventures.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Night Ops Adventures
                </a>
            </div>
        </footer>
    );
}
