"""Read email HTML as text without executing code or fetching remote resources."""
import re
from html.parser import HTMLParser


class EmailText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ignored = []
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in {'head', 'script', 'style'}:
            self.ignored.append(tag)
        if self.ignored:
            return
        if tag in {'br', 'p', 'div', 'li', 'tr'}:
            self.parts.append('\n')
        if tag == 'li':
            self.parts.append('• ')

    def handle_endtag(self, tag):
        if self.ignored:
            if tag == self.ignored[-1]:
                self.ignored.pop()
            return
        if tag in {'p', 'div', 'li', 'tr'}:
            self.parts.append('\n')

    def handle_data(self, data):
        if not self.ignored:
            self.parts.append(data)


def email_text(content):
    parser = EmailText()
    parser.feed(str(content)[:500000])
    return re.sub(r'\n[ \t\n]*\n', '\n\n', ''.join(parser.parts)).strip()
