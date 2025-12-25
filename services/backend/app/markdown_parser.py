import yaml
import re
from typing import Tuple

def parse_markdown_file(file_path: str) -> Tuple[dict, str]:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    match = re.match(r'^---\n(.*?)\n---\n(.*)', content, re.DOTALL)
    if match:
        frontmatter = yaml.safe_load(match.group(1))
        markdown_content = match.group(2)
        return frontmatter, markdown_content
    else:
        return {}, content
