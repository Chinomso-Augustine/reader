export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ error: "No PDF file provided." }), {
        status: 400
      });
    }

    if (file.size > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: "File exceeds 10MB size limit." }),
        { status: 413 }
      );
    }

    if (!file.type.includes("pdf")) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Please upload a PDF." }),
        { status: 415 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { default: pdfParse } = await import("pdf-parse");
    const data = await pdfParse(buffer);

    if (!data.text || data.text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No readable text found in this PDF." }),
        { status: 422 }
      );
    }

    return new Response(
      JSON.stringify({
        text: data.text,
        numpages: data.numpages || null,
        info: data.info || null
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("PDF extraction error", error);
    return new Response(
      JSON.stringify({ error: "Failed to process PDF." }),
      { status: 500 }
    );
  }
}
