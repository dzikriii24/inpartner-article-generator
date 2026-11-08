# Inpartner --- Design Guidelines

Dokumen ini menjadi acuan visual dan implementasi UI untuk seluruh
halaman dan komponen project **Inpartner**. Gunakan gambar design
reference yang diberikan sebagai sumber utama identitas visual.

Tujuan utamanya adalah menjaga tampilan Inpartner tetap konsisten,
profesional, mudah dibaca, dan mudah digunakan. Jangan membuat gaya
visual baru yang bertentangan dengan guideline ini.

------------------------------------------------------------------------

## 1. Design Principles

-   **Professional:** tampilkan karakter perusahaan yang terpercaya dan
    berorientasi bisnis.
-   **Clear hierarchy:** pengguna harus mudah membedakan judul, isi,
    informasi pendukung, dan tindakan utama.
-   **Consistent:** gunakan token warna, typography, button, spacing,
    dan komponen yang sama di seluruh aplikasi.
-   **Simple and functional:** hindari dekorasi yang tidak memiliki
    fungsi.
-   **Accessible:** pastikan teks terbaca, kontras memadai, dan komponen
    dapat digunakan dengan keyboard maupun touch.
-   **Responsive:** layout harus beradaptasi dengan baik pada desktop,
    tablet, dan mobile.

Jangan menggunakan emoji sebagai pengganti icon UI. Gunakan icon dari
library yang sudah digunakan project.

## 2. Brand Typography

Design reference menggunakan tiga keluarga font dengan peran yang
berbeda.

### 2.1 Inter --- Primary UI Font

Gunakan **Inter** sebagai font utama untuk antarmuka aplikasi.

Penggunaan: - Body text dan paragraf. - Form label dan input. - Navigasi
dan menu. - Button. - Tabel dan data. - Helper text, caption, serta
informasi pendukung.

Karakter: modern, netral, jelas, dan nyaman dibaca untuk penggunaan
aplikasi sehari-hari.

### 2.2 PT Sans --- Supporting Typography

Gunakan **PT Sans** sebagai font pendukung sesuai kebutuhan visual dan
hierarki pada design reference.

Penggunaan dapat mencakup: - Heading atau subheading tertentu. - Konten
editorial/informasi. - Elemen teks yang membutuhkan karakter berbeda
dari UI utama.

Jangan menggunakan PT Sans secara acak. Pertahankan peran dan
penerapannya secara konsisten.

### 2.3 Montserrat Extra Bold --- Inpartner Wordmark

Gunakan **Montserrat Extra Bold** khusus untuk wordmark atau identitas
tulisan **INPARTNER**, mengikuti referensi visual.

Ketentuan: - Gunakan kapitalisasi `INPARTNER`. - Pertahankan bobot Extra
Bold. - Gunakan warna brand blue. - Jangan mengganti wordmark dengan
Inter atau PT Sans. - Jangan mengubah proporsi huruf secara manual. -
Jika logo resmi tersedia sebagai aset SVG/PNG, prioritaskan aset resmi
tersebut daripada membuat ulang teks logo.

### 2.4 Typography Hierarchy

Gunakan skala tipografi yang konsisten. Nilai berikut merupakan titik
awal implementasi dan dapat disesuaikan dengan kebutuhan layout:

  Element              Desktop      Mobile Weight
  ---------------- ----------- ----------- -------------------
  Display / Hero     40--56 px   32--40 px Bold / Extra Bold
  H1                 32--40 px   28--32 px Bold
  H2                 24--32 px   22--26 px Semibold / Bold
  H3                 20--24 px   18--22 px Semibold
  Body                   16 px   15--16 px Regular
  Secondary text         14 px   13--14 px Regular
  Caption            12--13 px   12--13 px Regular
  Button             14--16 px   14--16 px Semibold / Bold

Aturan: - Gunakan line-height yang nyaman dibaca. - Hindari terlalu
banyak ukuran font berbeda dalam satu halaman. - Jangan menggunakan
Extra Bold untuk seluruh teks. - Gunakan bold untuk penekanan yang
benar-benar penting. - Hindari paragraf panjang dengan lebar baris yang
berlebihan. - Jangan mengecilkan body text secara berlebihan pada
mobile.

## 3. Brand Color Palette

Gunakan warna berikut sebagai token utama.

  -----------------------------------------------------------------------
  Token                   Hex                     Peran
  ----------------------- ----------------------- -----------------------
  Primary / Main          `#1976D2`               Warna utama brand,
                                                  primary button, link,
                                                  dan aksen penting

  Primary / Surface       `#D1E4F6`               Permukaan biru muda dan
                                                  area pendukung

  Primary / Border        `#B2D1F0`               Border, divider, dan
                                                  outline bernuansa biru

  Primary / Hover         `#1562AF`               Kondisi hover untuk
                                                  elemen primary

  Primary / Pressed       `#0C3B69`               Kondisi pressed/active
                                                  untuk elemen primary

  Primary / Focus         `#D1E4F6`               Focus treatment atau
                                                  focus ring dengan
                                                  kontras tambahan bila
                                                  diperlukan
  -----------------------------------------------------------------------

### 3.1 Color Usage

**Primary Main --- `#1976D2`** - Gunakan untuk CTA utama. - Link dan
elemen interaktif penting. - Highlight informasi yang relevan. - Aksen
brand yang tidak berlebihan.

**Primary Surface --- `#D1E4F6`** - Gunakan untuk background informasi
sekunder. - Area highlight ringan. - Container atau elemen pendukung
yang membutuhkan nuansa biru.

**Primary Border --- `#B2D1F0`** - Gunakan untuk border input atau
komponen tertentu. - Divider dan garis pemisah yang membutuhkan aksen
brand.

**Primary Hover --- `#1562AF`** - Gunakan ketika pointer berada di atas
primary button atau link interaktif. - Pastikan transisi tidak terlalu
mencolok.

**Primary Pressed --- `#0C3B69`** - Gunakan untuk kondisi tombol saat
ditekan atau active state.

**Primary Focus --- `#D1E4F6`** - Gunakan sebagai bagian dari focus
treatment. - Pastikan indikator fokus tetap terlihat jelas terhadap
warna permukaan di sekitarnya. Tambahkan outline yang kontras bila
diperlukan.

### 3.2 Neutral Colors

Gambar referensi menetapkan palet biru sebagai warna brand utama, tetapi
tidak menetapkan seluruh warna netral. Gunakan warna netral yang sudah
ada pada project jika tersedia.

Jika belum tersedia, gunakan prinsip berikut: - Background utama: putih
atau near-white. - Surface/card: putih. - Heading: near-black. - Body
text: dark neutral. - Secondary text: medium neutral. - Border: light
neutral. - Disabled: neutral dengan kontras yang tetap dapat dipahami.

Jangan menambahkan warna aksen baru tanpa kebutuhan desain yang jelas.

### 3.3 Color Discipline

-   Biru merupakan warna identitas utama Inpartner.
-   Jangan menggunakan seluruh shade biru sekaligus dalam satu komponen.
-   Hindari gradient sebagai dekorasi default.
-   Jangan menggunakan warna cerah yang tidak termasuk sistem brand
    untuk badge atau status.
-   Status sukses, peringatan, dan error boleh memakai warna semantik
    standar jika dibutuhkan, tetapi gunakan secara terbatas dan
    konsisten.
-   Pastikan rasio kontras teks dan background memenuhi kebutuhan
    aksesibilitas.

## 4. Button Guidelines

Gunakan button dengan bentuk rounded rectangle, warna solid, teks jelas,
dan elevasi/shadow yang halus sesuai referensi.

### 4.1 Primary Button

Untuk tindakan utama seperti: - Submit. - Get in Touch. - Learn More. -
See All. - Search. - Detail.

Karakter: - Background: `#1976D2`. - Text: putih. - Font: Inter,
semibold atau bold. - Border radius: rounded, konsisten dengan komponen
existing. - Shadow: ringan dan tidak berlebihan. - Hover: `#1562AF`. -
Pressed: `#0C3B69`.

### 4.2 Secondary Button

Gunakan untuk tindakan pendukung yang tidak menjadi fokus utama.

Karakter: - Background putih atau surface netral. - Text menggunakan
warna brand atau neutral gelap. - Border tipis. - Shadow minimal atau
tanpa shadow. - Hover menggunakan surface yang sedikit berbeda.

### 4.3 Button Labels

Gunakan label yang singkat, jelas, dan berorientasi tindakan.

Contoh label pada design reference: - `Submit` - `Get in Touch` -
`Learn More` - `See All` - `Search` - `Detail`

Jangan menggunakan label yang terlalu panjang jika tindakan dapat
dijelaskan dengan lebih ringkas.

### 4.4 Button States

Setiap button interaktif harus memiliki state: - Default. - Hover. -
Focus-visible. - Pressed. - Disabled. - Loading jika menjalankan proses
asynchronous.

Ketentuan: - Jangan menghilangkan focus indicator. - Button disabled
harus terlihat berbeda dan tidak dapat diklik. - Loading state harus
mencegah pengiriman form berulang. - Gunakan tinggi dan padding yang
konsisten. - Pada mobile, pastikan area sentuh nyaman.

## 5. Component Styling

### 5.1 Cards and Surfaces

-   Gunakan background putih atau neutral surface.
-   Gunakan border tipis jika diperlukan.
-   Gunakan shadow ringan, bukan shadow besar yang dekoratif.
-   Pertahankan padding dan radius yang konsisten.
-   Hindari membuat semua informasi menjadi card jika tabel, list, atau
    section biasa lebih tepat.
-   Jangan menambahkan badge pada setiap item.

### 5.2 Forms and Inputs

-   Gunakan typography Inter.
-   Label harus jelas dan selalu memiliki hubungan dengan input.
-   Border menggunakan neutral atau `#B2D1F0` sesuai konteks.
-   Focus state harus terlihat.
-   Error message ditempatkan dekat dengan field terkait.
-   Placeholder bukan pengganti label.
-   Gunakan ukuran input yang nyaman di desktop maupun mobile.

### 5.3 Navigation

-   Gunakan warna dan typography brand secara konsisten.
-   Bedakan active, hover, dan default state.
-   Pastikan struktur menu mudah dipahami.
-   Hindari terlalu banyak menu pada level yang sama.
-   Mobile navigation harus ringkas dan mudah digunakan.

### 5.4 Tables and Data

-   Prioritaskan keterbacaan data.
-   Gunakan heading kolom yang jelas.
-   Hindari terlalu banyak garis pemisah.
-   Gunakan warna biru hanya untuk highlight atau tindakan yang relevan.
-   Sediakan responsive behavior yang sesuai, seperti horizontal
    scrolling terbatas atau tampilan list pada mobile.

### 5.5 Icons

-   Gunakan icon library yang sudah menjadi standar project.
-   Pilih icon berdasarkan fungsi, bukan dekorasi.
-   Samakan ukuran, stroke, dan alignment.
-   Hindari emoji.
-   Jangan mencampur banyak gaya icon yang berbeda.

## 6. Layout, Spacing, and Responsive Design

Gunakan sistem spacing yang konsisten. Hindari margin dan padding acak
pada setiap komponen.

Prinsip layout: - Konten memiliki batas lebar yang nyaman dibaca. -
Alignment antar-section konsisten. - Gunakan whitespace untuk memisahkan
kelompok informasi. - Hindari elemen yang terlalu rapat atau terlalu
renggang. - Jangan menggunakan ukuran tetap yang menyebabkan overflow.

Responsive guidelines: - Desktop: gunakan ruang layar untuk menampilkan
informasi secara efisien. - Tablet: sesuaikan jumlah kolom dan jarak
komponen. - Mobile: prioritaskan keterbacaan dan efisiensi ruang. - Card
sederhana dapat ditampilkan dalam dua kolom pada mobile jika masih
nyaman dibaca. - Konten kompleks dapat menggunakan satu kolom. - Button
dan input harus tetap mudah digunakan dengan touch. - Hindari horizontal
overflow pada halaman utama.

## 7. Interaction and Motion

-   Gunakan transisi singkat dan halus.
-   Hindari animasi yang tidak membantu pemahaman atau feedback.
-   Hover bukan satu-satunya cara untuk mengakses informasi.
-   Semua interaksi harus mendukung keyboard dan touch.
-   Gunakan feedback yang jelas untuk success, error, loading, dan empty
    state.
-   Hormati preferensi `prefers-reduced-motion`.

## 8. Writing and Content Style

Gunakan bahasa yang profesional, jelas, dan berorientasi pada kebutuhan
pengguna.

-   Hindari copywriting yang terlalu berlebihan.
-   Hindari klaim yang tidak dapat dibuktikan.
-   Gunakan istilah secara konsisten.
-   Utamakan kalimat singkat dan informatif.
-   Gunakan kapitalisasi button dan heading secara konsisten.
-   Jangan menggunakan filler text atau konten placeholder pada
    production UI.

## 9. Anti-Patterns --- Avoid

Hindari hal-hal berikut: - Mengganti font brand tanpa alasan. -
Menggunakan warna di luar palet secara sembarangan. - Menggunakan emoji
sebagai icon. - Gradient, glow, dan shadow berlebihan. - Badge untuk
setiap informasi. - Card bertingkat tanpa kebutuhan. - Typography yang
terlalu banyak variasi. - Heading terlalu besar pada seluruh section. -
Tombol dengan bentuk dan warna yang tidak konsisten. - Animasi
berlebihan. - Layout mobile yang terlalu panjang karena semua card
dipaksa satu kolom. - Komponen dekoratif yang mengurangi ruang untuk
konten utama. - Mengubah logo atau wordmark secara tidak proporsional.

## 10. Implementation Checklist

Sebelum menyelesaikan perubahan UI, pastikan:

-   [ ] Inter digunakan sebagai font utama UI.
-   [ ] PT Sans digunakan secara konsisten sebagai font pendukung.
-   [ ] Montserrat Extra Bold digunakan untuk wordmark INPARTNER.
-   [ ] Warna brand sesuai token yang ditentukan.
-   [ ] Primary button menggunakan warna dan state yang konsisten.
-   [ ] Secondary button memiliki hierarki yang jelas.
-   [ ] Focus, hover, pressed, disabled, dan loading state tersedia
    sesuai kebutuhan.
-   [ ] Spacing dan typography konsisten.
-   [ ] Icon berasal dari library yang sesuai dan bukan emoji.
-   [ ] Layout responsive pada desktop, tablet, dan mobile.
-   [ ] Tidak ada horizontal overflow.
-   [ ] Kontras dan aksesibilitas diperhatikan.
-   [ ] Tidak ada dekorasi berlebihan atau pola UI generik.
-   [ ] Komponen existing digunakan kembali jika memungkinkan.

------------------------------------------------------------------------

## 11. Instruction for AI Coding Agents

Sebelum mengubah UI project Inpartner:

1.  Baca file guideline ini terlebih dahulu.
2.  Audit design system dan komponen yang sudah ada.
3.  Identifikasi font, warna, button, spacing, dan pola layout existing.
4.  Terapkan guideline ini secara konsisten pada halaman yang sedang
    dikerjakan.
5.  Reuse komponen dan design token jika sudah tersedia.
6.  Jangan membuat design system kedua yang bertentangan dengan
    guideline ini.
7.  Jangan melakukan redesign total jika perubahan yang dibutuhkan hanya
    pada bagian tertentu.
8.  Jangan mengarang aset brand atau mengubah logo.
9.  Setelah implementasi, periksa tampilan desktop dan mobile.
10. Laporkan file yang diubah dan validasi yang telah dilakukan.

**Prioritas akhir:** setiap halaman harus terasa sebagai bagian dari
satu produk Inpartner yang sama. Konsistensi brand, keterbacaan, fungsi,
dan kesederhanaan lebih penting daripada dekorasi visual yang
berlebihan.
