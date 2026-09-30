import { z } from "zod";

export const requestKey = z.uuid({ error: "Muat ulang halaman lalu coba lagi." });
