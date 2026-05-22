import { router, publicProcedure } from '../_core/trpc'; // Ajuste o caminho do seu arquivo trpc base se necessário
import { z } from 'zod';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const CURRENT_VERSION = "1.0.0"; // Versão atual do sistema local

export const updateRouter = router({
  // Consulta se existe nova versão no GitHub
  checkUpdate: publicProcedure.query(async () => {
    try {
      const response = await axios.get('https://github.com');
      const latestVersion = response.data.tag_name; // Ex: v1.0.1

      if (latestVersion === `v${CURRENT_VERSION}`) {
        return { hasUpdate: false, version: CURRENT_VERSION };
      }

      const zipAsset = response.data.assets.find((asset: any) => asset.name.endsWith('.zip'));
      if (!zipAsset) return { hasUpdate: false, version: CURRENT_VERSION };

      return { 
        hasUpdate: true, 
        url: zipAsset.browser_download_url, 
        version: latestVersion 
      };
    } catch (error) {
      console.error("Erro ao verificar atualização:", error);
      return { hasUpdate: false, version: CURRENT_VERSION, error: "Falha ao conectar ao GitHub" };
    }
  }),

  // Executa o download e substitui a pasta dist
  applyUpdate: publicProcedure
    .input(z.object({ downloadUrl: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const tempZipPath = path.join(process.cwd(), 'update.zip');
        const writer = fs.createWriteStream(tempZipPath);

        const response = await axios({ 
          url: input.downloadUrl, 
          method: 'GET', 
          responseType: 'stream' 
        });
        
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
          writer.on('finish', () => {
            try {
              const zip = new AdmZip(tempZipPath);
              zip.extractAllTo(process.cwd(), true); // Substitui a pasta dist antiga
              
              fs.unlinkSync(tempZipPath); // Remove o zip temporário

              // Desliga o processo após 2 segundos para o sistema reiniciar atualizado
              setTimeout(() => {
                process.exit(0);
              }, 2000);

              resolve({ success: true, message: "Sistema atualizado! Reiniciando..." });
            } catch (err) {
              reject(err);
            }
          });

          writer.on('error', (err) => reject(err));
        });
      } catch (error) {
        console.error("Erro ao aplicar atualização:", error);
        throw new Error("Falha ao baixar ou extrair os arquivos de atualização.");
      }
    })
});
