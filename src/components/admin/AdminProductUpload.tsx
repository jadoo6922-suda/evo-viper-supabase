import React, { useState, useRef } from 'react';
import {
  PlusCircle,
  Video,
  FileCode,
  DollarSign,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  Trash2,
  Archive,
  UploadCloud,
  FileUp,
  FileText,
  X,
  RefreshCw,
  HardDrive,
  File as FileIcon,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';

export const AdminProductUpload: React.FC = () => {
  const { products, adminAddProduct, adminArchiveProduct, language, currentUser } = useStore();
  const isAr = language === 'ar';

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [demoVideoUrl, setDemoVideoUrl] = useState('');
  const [fileFormat, setFileFormat] = useState('APK');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [price, setPrice] = useState('75');
  const [category, setCategory] = useState('development');
  const [thumbnail, setThumbnail] = useState(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
  );
  const [fileSize, setFileSize] = useState('24.5 MB');
  const [version, setVersion] = useState('v1.0.0');

  // Device File Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [showManualUrlInput, setShowManualUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const formatOptions = [
    { label: 'APK (Android Application Package)', value: 'APK' },
    { label: 'ZIP (Compressed Archive)', value: 'ZIP' },
    { label: 'PY (Python Script / Automation)', value: 'PY' },
    { label: 'TXT (Text / Config / Database Dump)', value: 'TXT' },
    { label: 'EXE (Windows Executable)', value: 'EXE' },
    { label: 'PDF (Digital Document / Guide)', value: 'PDF' },
    { label: 'RAR (WinRAR Archive)', value: 'RAR' },
    { label: 'JSON (Data Package / API Schemas)', value: 'JSON' },
    { label: 'TAR.GZ (Linux Unix Archive)', value: 'TAR.GZ' },
    { label: 'ISO (Disk Image)', value: 'ISO' },
  ];

  // Process selected file from device
  const handleProcessFile = (file: File) => {
    setUploadedFile(file);
    setFileName(file.name);

    // 1. Auto-detect extension and set fileFormat
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    const matched = formatOptions.find((f) => f.value === ext);
    if (matched) {
      setFileFormat(matched.value);
    } else if (ext) {
      setFileFormat(ext);
    }

    // 2. Auto-calculate formatted file size
    const sizeInMB = file.size / (1024 * 1024);
    const formattedSize =
      sizeInMB < 1
        ? `${Math.max(1, Math.round(file.size / 1024))} KB`
        : `${sizeInMB.toFixed(1)} MB`;
    setFileSize(formattedSize);

    // 3. Auto-populate product name if currently empty
    if (!name.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      setName(cleanName);
    }

    // 4. Create object URL for client download
    try {
      const blobUrl = URL.createObjectURL(file);
      setDownloadUrl(blobUrl);
    } catch {
      // fallback
    }

    // 5. Read small files (< 5MB) into base64 data URL for persistence
    if (file.size < 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFileData(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setFileData('');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileName('');
    setFileData('');
    setDownloadUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setThumbnail(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!name.trim()) {
      setStatusMessage({
        type: 'error',
        text: isAr ? 'يرجى إدخال اسم المنتج.' : 'Please enter a product name.',
      });
      return;
    }

    if (!description.trim()) {
      setStatusMessage({
        type: 'error',
        text: isAr ? 'يرجى كتابة وصف للمنتج.' : 'Please enter a product description.',
      });
      return;
    }

    if (!uploadedFile && !downloadUrl.trim()) {
      setStatusMessage({
        type: 'error',
        text: isAr
          ? 'يرجى رفع ملف المنتج الرقمي من ملفات جهازك.'
          : 'Please upload the digital product file from your device.',
      });
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setStatusMessage({
        type: 'error',
        text: isAr ? 'يرجى إدخال سعر صحيح بالكوينز.' : 'Please enter a valid price in coins.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let fileStoragePath: string | undefined;
      if (uploadedFile) {
        if (!supabase || !currentUser) throw new Error(isAr ? 'يجب تسجيل الدخول عبر Supabase لرفع الملفات.' : 'Sign in through Supabase to upload files.');
        const safeName = (uploadedFile.name || 'product.bin').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
        fileStoragePath = `${currentUser.id}/${crypto.randomUUID()}/${safeName}`;
        const { error: uploadError } = await supabase.storage.from('store-product-files').upload(fileStoragePath, uploadedFile, { contentType: uploadedFile.type || 'application/octet-stream', upsert: false });
        if (uploadError) throw uploadError;
      }
      const newProd: Partial<Product> = {
        name: name.trim(),
        nameEn: nameEn.trim() || name.trim(),
        description: description.trim(),
        descriptionEn: descriptionEn.trim() || description.trim(),
        demoVideoUrl: demoVideoUrl.trim() || undefined,
        fileFormat: fileFormat,
        fileType: fileFormat,
        fileName: fileName || `${name.toLowerCase().replace(/\s+/g, '_')}.${fileFormat.toLowerCase()}`,
        fileData: undefined,
        fileStoragePath,
        downloadUrl: downloadUrl.trim() || undefined,
        price: numPrice,
        category: category,
        thumbnail: thumbnail.trim(),
        fileSize: fileSize.trim() || '15 MB',
        version: version.trim() || 'v1.0.0',
        status: 'published',
        features: [
          `تنسيق الملف الرسمي: ${fileFormat}`,
          'تسليم فوري للملفات ورابط تنزيل مباشر',
          'دعم فني وتحديثات مستمرة لجميع المشترين',
        ],
        featuresEn: [
          `Official file format: ${fileFormat}`,
          'Instant digital delivery with direct download link',
          'Ongoing technical support and updates',
        ],
      };

      const saveResult = await adminAddProduct(newProd);
      if (!saveResult.success) throw new Error(saveResult.message || (isAr ? 'تعذر حفظ المنتج في Supabase.' : 'Could not save product to Supabase.'));

      setStatusMessage({
        type: 'success',
        text: isAr
          ? `تم رفع ونشر المنتج "${name}" مع الملف المرفوع بنجاح في متجر المنتجات الرقمية!`
          : `Successfully published "${name}" with uploaded file to the digital store!`,
      });

      // Reset form
      setName('');
      setNameEn('');
      setDescription('');
      setDescriptionEn('');
      setDemoVideoUrl('');
      setDownloadUrl('');
      setUploadedFile(null);
      setFileName('');
      setFileData('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
      setPrice('75');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || (isAr ? 'حدث خطأ أثناء حفظ المنتج.' : 'Error saving product.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="admin-product-upload-module">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#12161d] border border-[#c5a059]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#801428] to-[#590e1c] text-[#c5a059] border border-[#c5a059]/40 shadow-lg">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              {isAr ? 'قسم تنزيل وإضافة منتج رقمي جديد' : 'Publish New Digital Product'}
            </h2>
            <p className="text-xs text-white/60">
              {isAr
                ? 'أضف الاسم، الوصف، فيديو الشرح، صيغة الملف (APK, ZIP, TXT, PY...) ورابط التنزيل والسعر'
                : 'Upload product with name, description, video demo, format (APK, ZIP, TXT, PY...), and download link'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-[#12161d] border border-white/10 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Product Name (Arabic) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white block">
              {isAr ? '1. اسم المنتج (بالعربية) *' : '1. Product Name (Arabic) *'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAr ? 'مثلاً: تطبيق الحماية والسرعة المتكامل' : 'e.g. Pro Shield App'}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
            />
          </div>

          {/* Product Name (English) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white block">
              {isAr ? 'اسم المنتج (بالإنجليزية)' : 'Product Name (English)'}
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Ultra Shield Pro Suite"
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
            />
          </div>
        </div>

        {/* 2. Description */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-white block">
            {isAr ? '2. وصف المنتج الرقمي *' : '2. Product Description *'}
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isAr ? 'اكتب وصفاً شاملاً للمنتج ومميزاته وطريقة استخدامه...' : 'Write detailed product description...'}
            className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 3. Video Demo URL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>{isAr ? '3. رابط فيديو شرح المنتج (YouTube / MP4)' : '3. Video Demo URL'}</span>
            </label>
            <input
              type="url"
              value={demoVideoUrl}
              onChange={(e) => setDemoVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://cdn.site.com/demo.mp4"
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
            />
            {demoVideoUrl && (
              <span className="text-[10px] text-emerald-400 block">
                {isAr ? '✓ سيتم عرض مشغل الفيديو التفاعلي في صفحة تفاصيل المنتج' : '✓ Interactive video demo enabled'}
              </span>
            )}
          </div>

          {/* 4. Supported File Formats */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>{isAr ? '4. صيغة الملف (APK, ZIP, TXT, PY...)' : '4. File Format'}</span>
            </label>
            <select
              value={fileFormat}
              onChange={(e) => setFileFormat(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#c5a059]"
            >
              {formatOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#12161d] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 5. Direct Device File Upload (رفع الملف من ملفات الجهاز) */}
        <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-[#c5a059]/30">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#c5a059]" />
              <span>{isAr ? '5. رفع ملف المنتج الرقمي من جهازك *' : '5. Upload Product File From Device *'}</span>
            </label>
            <span className="text-[11px] text-[#c5a059] font-mono bg-[#c5a059]/10 px-2 py-0.5 rounded border border-[#c5a059]/20">
              APK, ZIP, RAR, EXE, PY, TXT, PDF, JSON, ISO
            </span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="hidden"
          />

          {!uploadedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2.5 ${
                isDragging
                  ? 'border-[#c5a059] bg-[#c5a059]/15 shadow-lg shadow-[#c5a059]/20'
                  : 'border-white/15 bg-black/30 hover:border-[#c5a059]/60 hover:bg-white/[0.02]'
              }`}
            >
              <div className="p-3 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059]">
                <FileUp className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {isAr ? 'اضغط لاختيار ملف من ملفات جهازك أو اسحبه وأفلته هنا' : 'Click to browse files from device or drag & drop here'}
                </p>
                <p className="text-[11px] text-white/50 mt-1">
                  {isAr
                    ? 'سيتم قراءة صيغة الملف، حجمه الدقيق، وتجهيزه فوراً للتنزيل عند الشراء'
                    : 'File format, exact size, and download link will be prepared automatically'}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-1 px-4 py-1.5 rounded-lg text-xs font-bold bg-[#c5a059] text-black hover:bg-[#d8b46e] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>{isAr ? 'تصفح ملفات الجهاز' : 'Browse Device Files'}</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
                  <FileIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs font-mono">
                      {fileName}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/30 uppercase">
                      {fileFormat}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-white/60">
                    <span className="font-semibold text-emerald-400">{fileSize}</span>
                    <span>•</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {isAr ? 'جاهز للتسليم الفوري للمشترين' : 'Ready for instant delivery'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/80 bg-white/10 hover:bg-white/20 transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isAr ? 'تغيير الملف' : 'Change File'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                  title={isAr ? 'حذف الملف' : 'Remove file'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Optional manual URL toggle */}
          <div className="pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setShowManualUrlInput(!showManualUrlInput)}
              className="text-[11px] text-white/50 hover:text-[#c5a059] transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span>{showManualUrlInput ? '▲' : '▼'}</span>
              <span>{isAr ? 'أو إدخال رابط تحميل مباشر يدوياً (اختياري)' : 'Or enter external download URL manually (optional)'}</span>
            </button>

            {showManualUrlInput && (
              <div className="mt-2 animate-in fade-in">
                <input
                  type="text"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder="https://downloads.store.com/packages/file.apk"
                  className="w-full px-4 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
                />
              </div>
            )}
          </div>
        </div>

        {/* 6. Price, Category & Version */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Price in Coins */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? '6. السعر بالكوينز (Coins)' : '6. Price (Coins)'}</span>
            </label>
            <input
              type="number"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="75"
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-black text-amber-400 focus:outline-none focus:border-[#c5a059]"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>{isAr ? '7. فئة المنتج' : '7. Category'}</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#c5a059]"
            >
              <option value="development" className="bg-[#12161d]">برمجة وتطوير (Development)</option>
              <option value="tools" className="bg-[#12161d]">أدوات ونظم (Tools & Scripts)</option>
              <option value="security" className="bg-[#12161d]">أمن سيبراني وحماية (Security)</option>
              <option value="ai" className="bg-[#12161d]">ذكاء اصطناعي (AI Models)</option>
              <option value="design" className="bg-[#12161d]">تصميم وقوالب (Design Assets)</option>
            </select>
          </div>

          {/* Version */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white block">
              {isAr ? 'رقم الإصدار' : 'Version'}
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v1.0.0"
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
            />
          </div>
        </div>

        {/* Thumbnail & File Size */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Thumbnail with Device Upload First */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>{isAr ? 'صورة الغلاف (رفع من ملفات الجهاز)' : 'Cover Thumbnail (Upload from Device)'}</span>
            </label>

            <input
              type="file"
              accept="image/*"
              ref={thumbnailInputRef}
              onChange={handleThumbnailUpload}
              className="hidden"
            />

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt="cover preview"
                    className="w-14 h-14 rounded-lg object-cover border border-[#c5a059]/40 shrink-0 bg-black"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/30 shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {isAr ? 'صورة المنتج المعروضة في المتجر' : 'Product display image in store'}
                  </p>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {isAr ? 'اختر صورة غلاف جذابة من جهازك بدقة عالية' : 'Select high-res image from device'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#c5a059]/20 text-[#c5a059] hover:bg-[#c5a059]/30 border border-[#c5a059]/40 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>{isAr ? 'اختر من الجهاز' : 'Upload Image'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* File Size */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white block">
              {isAr ? 'حجم الملف (تلقائي/مخصص)' : 'File Size'}
            </label>
            <input
              type="text"
              value={fileSize}
              onChange={(e) => setFileSize(e.target.value)}
              placeholder="e.g. 35.8 MB"
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
            />
          </div>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Submit Action */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-[#801428] via-[#a31a33] to-[#801428] hover:brightness-110 text-white border border-[#c5a059]/40 shadow-lg shadow-[#801428]/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <PlusCircle className="w-4 h-4 text-[#c5a059]" />
          <span>
            {isSubmitting
              ? isAr
                ? 'جاري نشر المنتج في المتجر...'
                : 'Publishing Product...'
              : isAr
              ? 'حفظ ونشر المنتج في المتجر فوراً'
              : 'Publish Product to Store Now'}
          </span>
        </button>
      </form>

      {/* Existing Products Overview */}
      <div className="p-6 rounded-2xl bg-[#12161d] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#c5a059]" />
            <h3 className="text-sm font-bold text-white">
              {isAr ? 'قائمة المنتجات المنشورة حالياً في المتجر' : 'Published Products Catalog'}
            </h3>
          </div>
          <span className="text-xs text-white/40">{products.length} {isAr ? 'منتج' : 'products'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="p-3.5 rounded-xl bg-black/30 border border-white/5 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start gap-3">
                <img
                  src={p.thumbnail}
                  alt={p.name}
                  className="w-12 h-12 rounded-lg object-cover border border-white/10"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/30">
                      {p.fileFormat || p.fileType}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 line-clamp-1 mt-0.5">{p.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs font-black text-amber-400">{p.price} Coins</span>
                    <span className="text-[10px] text-white/40">• {p.downloadsCount || 0} {isAr ? 'تحميل' : 'dls'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
                <span className="text-white/40 font-mono">{p.id}</span>
                <button
                  type="button"
                  onClick={() => adminArchiveProduct(p.id)}
                  className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer inline-flex items-center gap-1"
                >
                  <Archive className="w-3 h-3" />
                  <span>{isAr ? 'أرشفة' : 'Archive'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
