import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-faq',
  imports: [RouterLink],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Faq {
  expandedIndex: number | null = null;

  toggle(index: number) {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  faqs = [
    {
      question: 'Lorrie\'de nasıl sipariş oluşturabilirim?',
      answer: 'Ürün sayfasına gidip "Sepete Ekle" veya "Hemen Al" butonlarından birini seçin. Ardından sepetinizi görüntüleyip ödeme adımına geçin. Kargo bilgisi ve teslimat adresini girdikten sonra ödemenizi tamamlayın.'
    },
    {
      question: 'Siparişimi nasıl takip edebilirim?',
      answer: 'Sipariş verdikten sonra "Siparişlerim" sayfasından siparişinizi takip edebilirsiniz. Kargoya teslim edildiğinde SMS ve e-posta ile takip numarası gönderilecektir.'
    },
    {
      question: 'Kapıda ödeme seçeneği var mı?',
      answer: 'Evet, 500₺\'ye kadar olan siparişlerde kapıda nakit veya kredi kartı ile ödeme yapabilirsiniz.'
    },
    {
      question: 'Ürün iadesi için ne kadar sürem var?',
      answer: 'Teslimat tarihinden itibaren 14 gün içinde iade talep edebilirsiniz. Ürünlerin orijinal ambalajında ve kullanılmamış olması gerekmektedir.'
    },
    {
      question: 'Ücretsiz kargo nasıl kullanılır?',
      answer: 'Aynı satıcıdan 300₺ üzeri siparişlerde ücretsiz kargo uygulanır. Ayrıca kampanya dönemlerinde farklı eşik değerleri geçerli olabilir.'
    },
    {
      question: 'Favorilerimdeki ürünler sepete nasıl eklenir?',
      answer: 'Favorilerim sayfasında beğendiğiniz ürünlerin yanındaki "Sepete Ekle" butonuna tıklayarak ürünü sepetinize ekleyebilirsiniz.'
    },
    {
      question: 'Kredi kartı taksit seçenekleri nelerdir?',
      answer: 'Tüm kredi kartlarına 3, 6 ve 12 taksit seçenekleri sunulmaktadır. Taksit seçenekleri ödeme sayfasında görüntülenebilir.'
    },
    {
      question: 'Mobil uygulama mevcut mu?',
      answer: 'Evet, Lorrie mobil uygulaması hem iOS hem de Android platformlarında ücretsiz olarak indirilebilir. Uygulama üzerinden özel kampanyalardan yararlanabilirsiniz.'
    }
  ];
}
