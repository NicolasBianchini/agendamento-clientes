from pathlib import Path
from typing import Union


TITLE = "Checklist do Projeto"
READY_ITEMS = [
    "Adicionar nova role proprietario",
    "Revisar o tipo UserRole para incluir admin_master, proprietario, admin, profissional, cliente",
    "Ajustar regras de acesso no frontend para cada role",
    "Definir telas diferentes para painel interno e portal do cliente",
    "Criar colecao estabelecimentos",
    "Definir campos do estabelecimento: nome, slug, endereco, telefone, ativo, configuracoes de funcionamento",
    "Vincular usuarios a estabelecimentos",
    "Permitir que um estabelecimento tenha multiplos profissionais",
    "Modelar profissionais como usuarios com role profissional",
    "Criar vinculo profissional -> estabelecimento",
    "Criar vinculo profissional -> servicos atendidos",
    "Criar disponibilidade por profissional",
    "Criar bloqueios/folgas por profissional",
    "Transformar cliente em usuario autenticavel com role cliente",
    "Garantir cadastro com nome, telefone, email e identificador unico",
    "Vincular historico de agendamentos ao clienteUserId",
    "Evitar duplicidade de clientes por nome digitado manualmente",
    "Adaptar colecao agendamentos",
    "Incluir estabelecimentoId",
    "Incluir profissionalId",
    "Incluir clienteUserId",
    "Incluir servicoId",
    "Incluir status do agendamento",
    "Garantir validacao de conflito por profissional e horario",
    "Criar fluxo publico/logado de autoagendamento",
    "Exibir selecao de estabelecimento",
    "Exibir selecao de servico",
    "Exibir selecao de profissional",
    "Criar visao do profissional",
    "Mostrar somente a propria agenda",
    "Criar visao do cliente",
    "Revisar modelagem atual baseada em userId",
    "Atualizar tipos TypeScript",
    "Atualizar servicos do Firestore",
    "Atualizar permissoes de navegacao",
    "Criar opcao qualquer profissional disponivel",
    "Calcular horarios disponiveis por profissional",
    "Confirmar agendamento com dados do cliente autenticado",
    "Criar visao do proprietario",
    "Mostrar agenda completa do estabelecimento",
    "Mostrar profissionais vinculados",
    "Mostrar clientes do estabelecimento",
    "Mostrar servicos e configuracoes da unidade",
    "Mostrar somente os proprios atendimentos",
    "Restringir edicao ao proprio contexto",
    "Mostrar proximos agendamentos",
    "Mostrar historico",
    "Permitir cancelamento/remarcacao conforme regra do negocio",
    "Mostrar dados do estabelecimento e profissional do atendimento",
    "Integrar envio de mensagens por WhatsApp",
    "Configurar templates de confirmacao",
    "Configurar templates de lembrete",
    "Configurar templates de cancelamento/remarcacao",
    "Mover envio para backend/funcao segura para nao expor token",
    "Integrar calendario",
    "Criar evento no Google Calendar para o profissional/estabelecimento",
    "Gerar .ics para compatibilidade com Apple Calendar",
    "Associar evento do calendario ao agendamento",
    "Definir comportamento em alteracao e cancelamento",
    "Migrar dados existentes para estabelecimentoId",
    "Migrar agendamentos existentes para novo formato",
    "Validar impacto nas telas atuais",
    "Atualizar filtros de agenda",
    "Atualizar documentacao do projeto",
]

PENDING_ITEMS = [
    "Nenhum item pendente nesta etapa",
]


def escape_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap_text(text: str, width: int = 88) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
      candidate = word if not current else f"{current} {word}"
      if len(candidate) <= width:
          current = candidate
      else:
          if current:
              lines.append(current)
          current = word
    if current:
        lines.append(current)
    return lines


def build_pdf(output_path: Path) -> None:
    page_width = 595
    page_height = 842
    margin_x = 50
    margin_top = 60
    line_height = 16

    content_lines: list[tuple[str, int, int]] = []
    y = page_height - margin_top

    def ensure_space(lines_needed: int) -> None:
        nonlocal y
        if y - (lines_needed * line_height) < 50:
            content_lines.append(("__NEW_PAGE__", 0, 0))
            y = page_height - margin_top

    content_lines.append((TITLE, margin_x, y))
    y -= 28

    sections = [
        ("PRONTO", READY_ITEMS),
        ("PENDENTE", PENDING_ITEMS),
    ]

    for section_title, items in sections:
        ensure_space(2)
        content_lines.append((section_title, margin_x, y))
        y -= 24

        for index, item in enumerate(items, start=1):
            wrapped = wrap_text(f"{index}. {item}")
            ensure_space(len(wrapped))
            first = True
            for line in wrapped:
                x = margin_x if first else margin_x + 18
                content_lines.append((line, x, y))
                y -= line_height
                first = False
            y -= 4

        y -= 8

    pages: list[str] = []
    current_page = []
    title_font = "/F2 18 Tf"
    section_font = "/F2 14 Tf"
    body_font = "/F1 11 Tf"
    current_font = title_font
    current_page.append("BT")
    current_page.append(current_font)

    for text, x, y_pos in content_lines:
        if text == "__NEW_PAGE__":
            current_page.append("ET")
            pages.append("\n".join(current_page))
            current_page = ["BT", body_font]
            current_font = body_font
            continue

        desired_font = body_font
        if text == TITLE:
            desired_font = title_font
        elif text in ("PRONTO", "PENDENTE"):
            desired_font = section_font
        if desired_font != current_font:
            current_page.append(desired_font)
            current_font = desired_font

        current_page.append(f"1 0 0 1 {x} {y_pos} Tm ({escape_text(text)}) Tj")

    current_page.append("ET")
    pages.append("\n".join(current_page))

    objects: list[bytes] = []

    def add_object(data: Union[str, bytes]) -> int:
        payload = data.encode("latin-1") if isinstance(data, str) else data
        objects.append(payload)
        return len(objects)

    font1 = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font2 = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    content_ids = []
    for stream in pages:
        content_ids.append(add_object(f"<< /Length {len(stream.encode('latin-1'))} >>\nstream\n{stream}\nendstream"))

    page_ids = []
    pages_root_id = len(objects) + len(pages) + 1
    for content_id in content_ids:
        page_obj = (
            f"<< /Type /Page /Parent {pages_root_id} 0 R "
            f"/MediaBox [0 0 {page_width} {page_height}] "
            f"/Resources << /Font << /F1 {font1} 0 R /F2 {font2} 0 R >> >> "
            f"/Contents {content_id} 0 R >>"
        )
        page_ids.append(add_object(page_obj))

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    pages_root = add_object(f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>")
    catalog = add_object(f"<< /Type /Catalog /Pages {pages_root} 0 R >>")

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]

    for idx, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{idx} 0 obj\n".encode("latin-1"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))

    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root {catalog} 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF\n"
        ).encode("latin-1")
    )

    output_path.write_bytes(pdf)


if __name__ == "__main__":
    build_pdf(Path("checklist-projeto.pdf"))
