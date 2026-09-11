import { NextResponse } from "next/server";
import { dispatchReminder } from "@/lib/reminders/dispatch";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reminderId } = body;

    if (!reminderId) {
      return NextResponse.json(
        { success: false, error: "reminderId es requerido." },
        { status: 400 }
      );
    }

    const result = await dispatchReminder(reminderId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        reminderId,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "No se pudo despachar el mensaje.",
          reminderId,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error en reminders/send-now:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al enviar recordatorio" },
      { status: 500 }
    );
  }
}
