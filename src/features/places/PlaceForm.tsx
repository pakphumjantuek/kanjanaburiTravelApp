import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { useMemo, useState } from "react";

import TextInput from "../../../components/Inputs/TextInput";
import SelectInput from "../../../components/Inputs/SelectInput";
import TextAreaInput from "../../../components/Inputs/TextAreaInput";
import MapPicker from "../../../components/MapPicker";

import {
  useCreatePlaceMutation,
  useUpdatePlaceMutation,
  useUploadPlaceImagesBatchMutation,
  useDeletePlaceImageMutation,
  useGetByIdQuery,
} from "../placeApi";

import { useGetAllPlaceCategoryQuery } from "../../placeCategory/placeCategoryApi";
import { useGetAllPlaceTagQuery } from "../../placeTag/placeTagApi";
import type { CreatePlaceRequest, PlaceDto } from "../placeTypes";
import { showSuccessOk } from "../../../utils";
import { useCreateDefaultOpeningMutation } from "../../placeOpening/placeOpenApi";

// ---------- helpers ----------
const toNumOrUndef = (v: string) => (v.trim() === "" ? undefined : Number(v));
const toNum = (v: string) => Number(v);

type FormValues = {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  avgVisitMinutes: string; // ✅ เก็บเป็น string ในฟอร์ม
  priceRange: string; // ✅ เก็บเป็น string ในฟอร์ม
  categoryId: string; // ✅ เก็บเป็น string ในฟอร์ม (select มักคืน string)
  tagIds: number[]; // ✅ เลือกหลาย tag
  isActive: boolean;
};

const validationSchema = Yup.object({
  name: Yup.string().required("กรุณากรอกชื่อสถานที่"),
  categoryId: Yup.string()
    .required("กรุณาเลือกหมวดหมู่")
    .test("categoryId", "กรุณาเลือกหมวดหมู่", (v) => Number(v) > 0),
  latitude: Yup.number()
    .typeError("กรุณากรอกละติจูด")
    .required("กรุณากรอกละติจูด"),
  longitude: Yup.number()
    .typeError("กรุณากรอกลองจิจูด")
    .required("กรุณากรอกลองจิจูด"),
  description: Yup.string(),
  address: Yup.string(),
  openTime: Yup.string(),
  closeTime: Yup.string(),
  avgVisitMinutes: Yup.string(),
  priceRange: Yup.string(),
  tagIds: Yup.array().of(Yup.number()).default([]),
  isActive: Yup.boolean().default(true),
});

const FieldPill = ({ label, value }: { label: string; value: string }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border text-xs text-gray-700">
    <span className="text-gray-500">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

export default function PlaceFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  const navigate = useNavigate();
  const location = useLocation();
  const placeFromState = location.state?.place as PlaceDto | undefined;

  const placeIdNum = id ? Number(id) : undefined;
  const { data: placeFromApi } = useGetByIdQuery(placeIdNum!, {
    skip: !placeIdNum,
  });

  const { data: placeCategories } = useGetAllPlaceCategoryQuery({
    page: 1,
    pageSize: 100,
  });
  const { data: placeTags } = useGetAllPlaceTagQuery({
    page: 1,
    pageSize: 100,
  });

  const place = placeFromApi ?? placeFromState;

  const categoryOptions = useMemo(
    () =>
      placeCategories?.items?.map((c) => ({
        value: String(c.categoryId),
        label: c.categoryName,
      })) ?? [],
    [placeCategories]
  );

  const tagList = placeTags?.items ?? [];

  const [createPlace] = useCreatePlaceMutation();
  const [updatePlace] = useUpdatePlaceMutation();
  const [uploadBatch] = useUploadPlaceImagesBatchMutation();
  const [deleteImage] = useDeletePlaceImageMutation();
 const [createDefaultOpening] = useCreateDefaultOpeningMutation();

  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [replaceOld, setReplaceOld] = useState(false);

  const initialValues: FormValues = useMemo(
    () => ({
      name: place?.name ?? "",
      description: place?.description ?? "",
      latitude: place?.latitude ?? 14.0228,
      longitude: place?.longitude ?? 99.5328,
      address: place?.address ?? "",
      avgVisitMinutes:
        place?.avgVisitMinutes != null ? String(place.avgVisitMinutes) : "",
      priceRange: place?.priceRange != null ? String(place.priceRange) : "",
      categoryId: place?.categoryId != null ? String(place.categoryId) : "",

      // ✅ ใช้ tagIds จาก backend เลย
      tagIds: (place as any)?.tagIds ?? [],

      isActive: place?.isActive ?? true,
    }),
    [place]
  );

  const coverLabel = useMemo(
    () =>
      newFiles.length
        ? newFiles[coverIndex]?.name ?? "ยังไม่ได้เลือกรูปปก"
        : "ยังไม่มีรูปใหม่",
    [newFiles, coverIndex]
  );

  const toPayload = (v: FormValues): CreatePlaceRequest => ({
    name: v.name.trim(),
    description: v.description?.trim() || undefined,
    latitude: v.latitude,
    longitude: v.longitude,
    address: v.address?.trim() || undefined,
    avgVisitMinutes: toNumOrUndef(v.avgVisitMinutes),
    priceRange: toNumOrUndef(v.priceRange),
    categoryId: v.categoryId ? toNum(v.categoryId) : undefined,
    isActive: v.isActive,

    // ✅ ถ้าคุณเพิ่มใน CreatePlaceRequest แล้ว
    tagIds: v.tagIds,
  });

  const uploadIfAny = async (placeId: number) => {
    if (!newFiles.length) return;

    try {
      await uploadBatch({
        placeId,
        files: newFiles,
        coverIndex,
        replaceOld,
      }).unwrap();
    } catch (e) {
      // ✅ เลือกได้: ถ้าอยากให้ upload พังแล้ว “ยัง navigate” ก็ไม่ throw
      console.error("upload failed:", e);
    }
  };

 const handleSubmit = async (values: FormValues) => {
  try {
    const payload = toPayload(values);

    let placeId: number;

    if (isEditMode) {
      if (!place?.placeId) throw new Error("ไม่พบ placeId สำหรับแก้ไข");
      placeId = place.placeId;

      await updatePlace({ id: placeId, body: payload }).unwrap();
    } else {
      const created = await createPlace(payload).unwrap();
      placeId = created.placeId; // ✅ ต้องให้ backend ส่ง placeId กลับมา

      // ✅ Auto create opening hours default ทันทีหลังสร้างสถานที่
      // (แนะนำ format มีวินาที กัน TimeOnly งอแง)
      try {
        await createDefaultOpening({
          placeId,
          body: { openTime: "09:00:00", closeTime: "18:00:00" },
        }).unwrap();
      } catch (e: any) {
        // ถ้าสร้างเวลาไม่ได้ ไม่จำเป็นต้องทำให้สร้างสถานที่ล้ม
        console.warn("CREATE DEFAULT OPENING FAILED:", e);
      }
    }

    await uploadIfAny(placeId);

    await showSuccessOk("บันทึกสถานที่เรียบร้อยแล้ว");
    navigate("/admin/place", { replace: true });
  } catch (err) {
    console.error("SUBMIT ERROR:", err);
  }
};


  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white p-4 lg:p-6">
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSubmit}
      >
        {({ values, setFieldValue, isSubmitting }) => {
          const completion = (() => {
            const required = [
              values.name?.trim(),
              values.categoryId,
              values.latitude,
              values.longitude,
            ];
            const filled = required.filter(
              (x) => x !== undefined && x !== null && `${x}`.trim() !== ""
            ).length;
            return Math.round((filled / required.length) * 100);
          })();

          return (
            <Form className="max-w-7xl mx-auto space-y-4">
              {/* Header */}
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-0 z-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 border">
                        🏙️
                      </span>
                      {isEditMode ? "แก้ไขสถานที่" : "เพิ่มสถานที่ใหม่"}
                    </h1>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <FieldPill label="ความครบถ้วน" value={`${completion}%`} />
                      <FieldPill
                        label="พิกัด"
                        value={`${Number(values.latitude || 0).toFixed(
                          5
                        )}, ${Number(values.longitude || 0).toFixed(5)}`}
                      />
                      <FieldPill label="รูปปกใหม่" value={coverLabel} />
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => navigate("/admin/place")}
                      className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 text-gray-700 font-medium text-sm rounded-xl hover:bg-gray-200 transition"
                    >
                      ยกเลิก
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none px-6 py-2 font-medium text-sm rounded-xl shadow-sm transition bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:hover:bg-gray-400"
                    >
                      {isSubmitting ? "กำลังบันทึก..." : "บันทึกสถานที่"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* LEFT */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Basic */}
                  <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <span className="w-1 h-4 bg-blue-500 rounded-full" />
                      ข้อมูลพื้นฐาน
                    </h2>

                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <TextInput
                            label="ชื่อสถานที่"
                            name="name"
                            placeholder="ระบุชื่อสถานที่"
                          />
                        </div>

                        <SelectInput
                          label="หมวดหมู่"
                          name="categoryId"
                          options={categoryOptions as any}
                        />
                      </div>

                      <TextAreaInput
                        label="คำอธิบาย"
                        name="description"
                        placeholder="รายละเอียดสถานที่ (ประวัติ, วัฒนธรรม, จุดเด่น)..."
                        rows={6}
                      />
                    </div>
                  </section>

                  {/* TAGS */}
                  <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                      แท็ก (เลือกได้หลายอัน)
                    </h2>

                    <div className="flex flex-wrap gap-2">
                      {tagList.map((t: any) => {
                        const tid = Number(t.tagId);
                        const active = values.tagIds.includes(tid);
                        return (
                          <button
                            key={t.tagId}
                            type="button"
                            onClick={() => {
                              const tid = Number(t.tagId);
                              const active = values.tagIds.includes(tid);
                              const next = active
                                ? values.tagIds.filter((x) => x !== tid)
                                : [...values.tagIds, tid];

                              setFieldValue("tagIds", next);
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm border transition ${
                              active
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {t.tagName ?? t.name ?? `Tag ${t.tagId}`}
                          </button>
                        );
                      })}
                      {!tagList.length && (
                        <div className="text-sm text-gray-500">
                          ยังไม่มีแท็ก (ลองเพิ่มในระบบแท็กก่อน)
                        </div>
                      )}
                    </div>
                  </section>

                  {/* CURRENT IMAGES */}
                  {isEditMode && place?.images?.length ? (
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                          <span className="w-1 h-4 bg-slate-500 rounded-full" />
                          รูปปัจจุบัน
                        </h2>
                        <span className="text-xs text-gray-500">
                          ลบได้ทีละรูป
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {place.images.map((img) => (
                          <div
                            key={img.imageId}
                            className="relative rounded-xl overflow-hidden border bg-gray-50"
                          >
                            <img
                              src={`${
                                import.meta.env.VITE_API_BASE_URLS ?? ""
                              }${img.imageUrl}`}
                              alt="current"
                              className="w-full h-28 object-cover"
                            />
                            {img.isCover && (
                              <div className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded-full bg-white/90 border">
                                ⭐ ปัจจุบันเป็นปก
                              </div>
                            )}
                            <button
                              type="button"
                              className="absolute top-2 right-2 text-[11px] px-2 py-1 rounded-full bg-red-600 text-white hover:bg-red-700"
                              onClick={async () => {
                                await deleteImage({
                                  placeId: place.placeId,
                                  imageId: img.imageId,
                                }).unwrap();
                              }}
                            >
                              ลบ
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {/* NEW IMAGES */}
                  <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-1 h-4 bg-purple-500 rounded-full" />
                        อัปโหลดรูปใหม่ (หลายรูป + เลือกปก)
                      </h2>
                      <span className="text-xs text-gray-500">
                        คลิกรูปเพื่อเลือกเป็น “ปก”
                      </span>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        setNewFiles(files);
                        setCoverIndex(0);
                      }}
                      className="block w-full text-sm text-gray-700 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />

                    <label className="flex items-center gap-2 text-sm text-gray-700 mt-3">
                      <input
                        type="checkbox"
                        checked={replaceOld}
                        onChange={(e) => setReplaceOld(e.target.checked)}
                      />
                      อัปแล้วลบรูปเก่าทั้งหมด (Replace)
                    </label>

                    {newFiles.length > 0 && (
                      <div className="mt-3 text-xs text-gray-600">
                        เลือกแล้ว {newFiles.length} รูป • รูปปกใหม่:{" "}
                        <span className="font-semibold">
                          {newFiles[coverIndex]?.name}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                      {newFiles.map((file, idx) => {
                        const preview = URL.createObjectURL(file);
                        const isCover = idx === coverIndex;

                        return (
                          <button
                            key={`${file.name}-${file.lastModified}-${idx}`}
                            type="button"
                            onClick={() => setCoverIndex(idx)}
                            className={`relative rounded-xl overflow-hidden border bg-gray-50 ${
                              isCover
                                ? "ring-2 ring-blue-500"
                                : "hover:ring-2 hover:ring-gray-200"
                            }`}
                          >
                            <img
                              src={preview}
                              alt={file.name}
                              className="w-full h-28 object-cover"
                              onLoad={() => URL.revokeObjectURL(preview)}
                            />
                            <div className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded-full bg-white/90 border">
                              {isCover ? "⭐ ปก" : "เลือกเป็นปก"}
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-black/35 text-white text-[11px] px-2 py-1 truncate">
                              {file.name}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {/* RIGHT */}
                <div className="lg:col-span-4 space-y-4">
                  <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <span className="w-1 h-4 bg-green-500 rounded-full" />
                      พิกัดและที่อยู่
                    </h2>

                    <div className="space-y-3">
                      <TextInput
                        label="ที่อยู่"
                        name="address"
                        placeholder="ระบุที่อยู่ หรือให้แผนที่เติมให้"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <TextInput
                          label="Lat"
                          name="latitude"
                          type="number"
                          placeholder="13.xxx"
                        />
                        <TextInput
                          label="Long"
                          name="longitude"
                          type="number"
                          placeholder="99.xxx"
                        />
                      </div>

                      <div className="relative z-0 overflow-hidden rounded-2xl border border-slate-200">
                        <MapPicker
                          lat={Number(values.latitude) || 13.7563}
                          lng={Number(values.longitude) || 100.5018}
                          onChange={(lat, lng, address) => {
                            setFieldValue("latitude", Number(lat.toFixed(6)));
                            setFieldValue("longitude", Number(lng.toFixed(6)));
                            if (address) setFieldValue("address", address);
                          }}
                        />
                      </div>
                    </div>
                  </section>

                  <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <span className="w-1 h-4 bg-orange-500 rounded-full" />
                      เวลาและข้อมูลอื่นๆ
                    </h2>

                    <div className="space-y-3">                    
                      <div className="grid grid-cols-2 gap-3">
                        <TextInput
                          label="เวลาชม (นาที)"
                          name="avgVisitMinutes"
                          type="number"
                          placeholder="60"
                        />
                        <TextInput
                          label="ค่าเข้า (บาท)"
                          name="priceRange"
                          type="number"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
}
