"""Build the public V2 demo without importing Django or reading its database."""
import argparse
import ast
from pathlib import Path, PurePosixPath
from posixpath import relpath
import re

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist-pages"
LICENSES = {
    "static/v2/vendor/qrcode-generator-LICENSE.txt",
    "static/v2/vendor/SheetJS-LICENSE.txt",
}
PRINT_ROUTE = "/scdrpt/rpt_printCrt.shtml"
PRINT_PAGE = "static/v2/elevator-print.html"
ASSET_PATH = re.compile(r'''(?<=["'\x60(])(/static/[^"'\x60()\s?#]+|/scdrpt/[^"'\x60()\s?#]+)''')
SECRET_MARKER = re.compile(rb"-----BEGIN [A-Z ]*PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b")


def build_assets():
    server = ast.parse((ROOT / "v2_server.py").read_text(encoding="utf-8"))
    allowlist = next(
        ast.literal_eval(node.value)
        for node in server.body
        if isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == "allowed" for target in node.targets)
    )
    sources = {item.removeprefix("/") for item in allowlist} | LICENSES
    assets = {".nojekyll": b""}
    for name in sorted(sources):
        relative = PurePosixPath(name)
        if not (
            name == "static/v2.html"
            or re.fullmatch(r"static/v2/(?:[a-z0-9-]+\.(?:js|css|html)|vendor/(?:qrcode\.js|xlsx\.full\.min\.js)|templates/(?:safety-valve-import\.xlsx|jyryExp\.xls))", name)
            or name in LICENSES
        ):
            raise ValueError(f"Unexpected public asset: {name}")
        source = ROOT.joinpath(*relative.parts)
        if source.resolve() != source or not source.is_file():
            raise ValueError(f"Missing or redirected source: {name}")
        data = source.read_bytes()
        if SECRET_MARKER.search(data):
            raise ValueError(f"Credential marker in public asset: {name}")

        if relative.suffix in {".html", ".js", ".css"} and "vendor" not in relative.parts:
            def rewrite(match):
                url = match[0]
                target = PRINT_PAGE if url == PRINT_ROUTE else url.removeprefix("/")
                if target not in sources:
                    raise ValueError(f"Unknown asset {url} referenced by {name}")
                # JavaScript URLs resolve against the document that loads the script.
                parent = relative.parent if (
                    name == PRINT_PAGE or relative.suffix == ".css"
                    or name == "static/v2/elevator-print.js"
                ) else PurePosixPath(".")
                return "./" + relpath(target, parent)

            data = ASSET_PATH.sub(rewrite, data.decode("utf-8")).encode("utf-8")
        assets["index.html" if name == "static/v2.html" else name] = data
    if "index.html" not in assets or PRINT_PAGE not in assets:
        raise ValueError("Missing entry or print page")
    return assets


def verify_tree(assets, check_content):
    if OUTPUT.resolve() != OUTPUT:
        raise ValueError("dist-pages must be a real directory inside the project")
    files = set()
    directories = {parent.as_posix() for name in assets for parent in PurePosixPath(name).parents}
    for path in OUTPUT.rglob("*"):
        name = path.relative_to(OUTPUT).as_posix()
        if path.resolve() != path:
            raise ValueError(f"Redirected output path: {name}")
        if path.is_dir() and name in directories:
            continue
        if not path.is_file() or name not in assets:
            raise ValueError(f"Unexpected output path: {name}")
        if path.stat().st_nlink != 1:
            raise ValueError(f"Hard-linked output file: {name}")
        files.add(name)
        if check_content and path.read_bytes() != assets[name]:
            raise ValueError(f"Stale or modified output: {name}")
    if check_content and files != assets.keys():
        raise ValueError(f"Missing output files: {', '.join(sorted(assets.keys() - files))}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify existing output without writing it")
    args = parser.parse_args()
    try:
        assets = build_assets()
        if not args.check:
            verify_tree(assets, check_content=False)
            for name, content in assets.items():
                path = OUTPUT / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(content)
        verify_tree(assets, check_content=True)
    except (OSError, ValueError, StopIteration) as error:
        parser.exit(1, f"V2 Pages: {error}\n")
    print(f"Verified {len(assets)} public files in {OUTPUT}")


if __name__ == "__main__":
    main()
