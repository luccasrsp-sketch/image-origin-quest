import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

// Biblical verses of encouragement for sales team
const VERSES = [
  { text: "Tudo posso naquele que me fortalece.", reference: "Filipenses 4:13" },
  { text: "Porque para Deus nada é impossível.", reference: "Lucas 1:37" },
  { text: "O Senhor é a minha força e o meu escudo; nele o meu coração confia, e dele recebo ajuda.", reference: "Salmos 28:7" },
  { text: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo.", reference: "Isaías 41:10" },
  { text: "Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.", reference: "Salmos 37:5" },
  { text: "Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.", reference: "Provérbios 3:5" },
  { text: "Porque os que esperam no Senhor renovam as suas forças.", reference: "Isaías 40:31" },
  { text: "O Senhor é o meu pastor; nada me faltará.", reference: "Salmos 23:1" },
  { text: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.", reference: "Salmos 46:1" },
  { text: "E sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus.", reference: "Romanos 8:28" },
  { text: "Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.", reference: "Jeremias 29:11" },
  { text: "Busquem primeiro o Reino de Deus e a sua justiça, e todas essas coisas serão acrescentadas a vocês.", reference: "Mateus 6:33" },
  { text: "Posso todas as coisas em Cristo que me fortalece.", reference: "Filipenses 4:13" },
  { text: "O coração do homem planeja o seu caminho, mas o Senhor lhe dirige os passos.", reference: "Provérbios 16:9" },
  { text: "Alegrem-se sempre. Orem continuamente. Deem graças em todas as circunstâncias.", reference: "1 Tessalonicenses 5:16-18" },
  { text: "Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.", reference: "Josué 1:9" },
  { text: "Quando a ansiedade já me dominava no íntimo, o teu consolo trouxe alívio à minha alma.", reference: "Salmos 94:19" },
  { text: "O Senhor fará de você a cabeça, e não a cauda. Você estará sempre por cima, e nunca por baixo.", reference: "Deuteronômio 28:13" },
  { text: "Bem-aventurado o homem que confia no Senhor, e cuja esperança é o Senhor.", reference: "Jeremias 17:7" },
  { text: "O trabalho de suas mãos será recompensado.", reference: "Provérbios 31:31" },
  { text: "Não deixe de falar as palavras deste Livro da Lei e de meditar nelas de dia e de noite, para que você cumpra fielmente tudo o que nele está escrito. Só então os seus caminhos prosperarão.", reference: "Josué 1:8" },
  { text: "Quem anda com os sábios será sábio, mas o companheiro dos tolos sofrerá.", reference: "Provérbios 13:20" },
  { text: "O preguiçoso deseja e nada consegue, mas os desejos dos diligentes são plenamente satisfeitos.", reference: "Provérbios 13:4" },
  { text: "A bênção do Senhor traz riqueza, e não acrescenta dor alguma.", reference: "Provérbios 10:22" },
  { text: "Lança o teu pão sobre as águas, porque depois de muitos dias o acharás.", reference: "Eclesiastes 11:1" },
  { text: "Ao amanhecer semeia a tua semente e até a tarde não deixes descansar as tuas mãos.", reference: "Eclesiastes 11:6" },
  { text: "Os planos do diligente tendem à abundância, mas os de quem é precipitado, apenas à necessidade.", reference: "Provérbios 21:5" },
  { text: "Peçam e receberão, para que a alegria de vocês seja completa.", reference: "João 16:24" },
  { text: "Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas, diante de Deus, as vossas petições, pela oração e pela súplica.", reference: "Filipenses 4:6" },
  { text: "A fé é a certeza daquilo que esperamos e a prova das coisas que não vemos.", reference: "Hebreus 11:1" },
  { text: "E, tudo o que pedirem em oração, se crerem, vocês receberão.", reference: "Mateus 21:22" },
];

export function DailyVerse() {
  // Get verse based on day of year for daily rotation
  const getDailyVerse = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return VERSES[dayOfYear % VERSES.length];
  };

  const verse = getDailyVerse();

  return (
    <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm md:text-base text-foreground italic leading-relaxed">
              "{verse.text}"
            </p>
            <p className="text-xs md:text-sm text-primary font-medium">
              — {verse.reference}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
