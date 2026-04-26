import React, { useEffect, useMemo, useState } from "react";
import {
  Cpu,
  LoaderCircle,
  Minus,
  Plus,
  ShieldCheck,
  Thermometer,
  Wifi,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  createCheckoutSession,
  getCheckoutSessionStatus,
  getStoreProduct,
  type CheckoutSessionStatus,
  type StoreProduct,
} from "@/services/store.service";

const installationTips = [
  "Install the device 1.5 to 2 meters above the floor for more stable environmental readings.",
  "Avoid placing the unit directly near heaters, windows, or strong drafts.",
  "Use one device per room or enclosure zone where you want independent temperature and air-quality tracking.",
  "Connect it to steady Wi-Fi and place it where staff can easily access the status light and mounting bracket.",
];

const formatCurrency = (amountInMinorUnits: number, currency: string) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amountInMinorUnits / 100);

const getStoredBuyer = (): {
  id?: string;
  name?: string;
  email?: string;
} | null => {
  const raw = localStorage.getItem("user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as { id?: string; name?: string; email?: string };
  } catch {
    return null;
  }
};

const StorePage: React.FC = () => {
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [checkoutStatus, setCheckoutStatus] =
    useState<CheckoutSessionStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const checkoutState = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("session_id");
  const unitAmount = product?.unitAmount ?? 24900;
  const currency = product?.currency ?? "eur";

  const totalPrice = useMemo(
    () => unitAmount * quantity,
    [unitAmount, quantity],
  );

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      try {
        const nextProduct = await getStoreProduct();
        if (isMounted) {
          setProduct(nextProduct);
        }
      } catch (error: unknown) {
        if (isMounted) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to load store product",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingProduct(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (checkoutState !== "success" || !checkoutSessionId) {
      setCheckoutStatus(null);
      setStatusError(null);
      setIsLoadingStatus(false);
      return () => {
        isMounted = false;
      };
    }

    const loadCheckoutStatus = async () => {
      setIsLoadingStatus(true);
      setStatusError(null);

      try {
        const status = await getCheckoutSessionStatus(checkoutSessionId);
        if (isMounted) {
          setCheckoutStatus(status);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setStatusError(
            error instanceof Error
              ? error.message
              : "Failed to verify the payment status.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingStatus(false);
        }
      }
    };

    loadCheckoutStatus();

    return () => {
      isMounted = false;
    };
  }, [checkoutSessionId, checkoutState]);

  const handleBuy = async () => {
    if (!product?.stripeEnabled) {
      toast.error("Stripe checkout is not configured yet.");
      return;
    }

    setIsCreatingCheckout(true);

    try {
      const buyer = getStoredBuyer();
      const session = await createCheckoutSession({
        quantity,
        customerEmail: buyer?.email,
        customerName: buyer?.name,
        userId: buyer?.id,
      });

      window.location.assign(session.url);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to start Stripe checkout",
      );
      setIsCreatingCheckout(false);
    }
  };

  return (
    <div className="py-8 space-y-8">
      {(checkoutState === "cancelled" ||
        checkoutStatus ||
        isLoadingStatus ||
        statusError) && (
        <section
          className={[
            "max-w-5xl mx-auto rounded-3xl border px-6 py-5 shadow-sm",
            checkoutStatus?.isPaid
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
              : checkoutState === "cancelled"
                ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
                : statusError
                  ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
                  : "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200",
          ].join(" ")}
        >
          {isLoadingStatus ? (
            <div className="flex items-center gap-3 text-sm font-medium">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Checking Stripe payment status...
            </div>
          ) : checkoutStatus?.isPaid ? (
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Payment received</h2>
              <p className="text-sm leading-6">
                Stripe marked this checkout as paid. Reference{" "}
                <span className="font-semibold">{checkoutStatus.id}</span> for{" "}
                {formatCurrency(
                  checkoutStatus.amountTotal,
                  checkoutStatus.currency,
                )}
                .
              </p>
              {checkoutStatus.customerEmail && (
                <p className="text-sm leading-6">
                  Receipt email: {checkoutStatus.customerEmail}
                </p>
              )}
            </div>
          ) : checkoutState === "cancelled" ? (
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Checkout was cancelled</h2>
              <p className="text-sm leading-6">
                No payment was completed. You can adjust the quantity and try
                again when you are ready.
              </p>
            </div>
          ) : statusError ? (
            <div className="space-y-2">
              <h2 className="text-xl font-bold">
                We could not verify this checkout yet
              </h2>
              <p className="text-sm leading-6">{statusError}</p>
            </div>
          ) : checkoutStatus ? (
            <div className="space-y-2">
              <h2 className="text-xl font-bold">
                Checkout created, payment still pending
              </h2>
              <p className="text-sm leading-6">
                Stripe returned this session, but it is not marked as paid yet.
                Current payment status:{" "}
                {checkoutStatus.paymentStatus ?? "unknown"}.
              </p>
            </div>
          ) : null}
        </section>
      )}

      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.82)] md:p-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-200">
          <Cpu className="w-4 h-4" />
          Stripe checkout enabled storefront
        </div>
        <h1 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
          Store
        </h1>
        <p className="mx-auto max-w-3xl text-lg leading-7 text-slate-600 dark:text-slate-300">
          A focused product page for one core shelter device. The page now
          starts a real Stripe Checkout flow and returns here with the verified
          payment status.
        </p>
      </section>

      <section className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.82)]">
        <div className="grid lg:grid-cols-[1fr_0.95fr]">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white p-10 flex flex-col justify-between min-h-[520px]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm font-medium mb-6">
                IoT Device
              </div>
              <h2 className="text-4xl font-bold mb-4">
                {product?.name ?? "Smart Shelter IoT Device"}
              </h2>
              <p className="text-slate-200 text-lg leading-8 max-w-xl">
                {product?.description ??
                  "A compact environmental monitoring unit built for shelters and adopters who want reliable room-level visibility into comfort and air quality."}
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mt-10">
              <div className="rounded-2xl bg-white/10 p-4">
                <Thermometer className="w-5 h-5 mb-3" />
                <div className="font-semibold">Climate tracking</div>
                <div className="text-sm text-slate-300">
                  Temperature and humidity monitoring
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <Wifi className="w-5 h-5 mb-3" />
                <div className="font-semibold">Wi-Fi connected</div>
                <div className="text-sm text-slate-300">
                  Ready for dashboard sync and alerts
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <ShieldCheck className="w-5 h-5 mb-3" />
                <div className="font-semibold">Shelter-ready</div>
                <div className="text-sm text-slate-300">
                  Designed for daily operational use
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-10 flex flex-col">
            <div className="mb-6">
              <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                Unit price
              </div>
              <div className="text-4xl font-bold text-slate-900 dark:text-white">
                {isLoadingProduct
                  ? "Loading..."
                  : formatCurrency(unitAmount, currency)}
              </div>
            </div>

            <div className="mb-6 rounded-3xl bg-slate-100/80 p-5 dark:bg-slate-800/80">
              <div className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                Quantity
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 transition-colors hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900"
                    onClick={() =>
                      setQuantity((current) => Math.max(1, current - 1))
                    }
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="min-w-10 text-center text-2xl font-bold text-slate-900 dark:text-white">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 transition-colors hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900"
                    onClick={() => setQuantity((current) => current + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Total price
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(totalPrice, currency)}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full px-6 py-4 rounded-2xl bg-primary-600 text-white text-base font-semibold hover:bg-primary-700 transition-colors mb-3 disabled:cursor-not-allowed disabled:bg-primary-400"
              disabled={
                isCreatingCheckout ||
                isLoadingProduct ||
                !product?.stripeEnabled
              }
              onClick={handleBuy}
            >
              {isCreatingCheckout
                ? "Redirecting to Stripe..."
                : "Buy with Stripe"}
            </button>
            <p className="mb-8 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {product?.stripeEnabled
                ? "Checkout opens on Stripe-hosted pages so card details never touch this frontend or backend."
                : "Stripe is not configured yet. Add the Stripe secret key on the backend to enable purchases."}
            </p>

            <div className="space-y-6 leading-7 text-slate-600 dark:text-slate-300">
              <div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                  Why this device matters
                </h3>
                <p>
                  The device helps shelters maintain safer conditions by making
                  environmental changes visible sooner. It supports daily
                  operations, pet comfort, and future alerting workflows.
                </p>
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                  Recommended use
                </h3>
                <p>
                  Use it in adoption rooms, cat zones, dog rooms, medical
                  spaces, or home environments where air quality and temperature
                  consistency matter.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.8)]">
          <h3 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">
            Installation recommendations
          </h3>
          <ul className="space-y-3">
            {installationTips.map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-3 text-slate-600 dark:text-slate-300"
              >
                <ShieldCheck className="w-5 h-5 text-primary-600 mt-1" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.8)]">
          <h3 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">
            What is included
          </h3>
          <div className="space-y-4 leading-7 text-slate-600 dark:text-slate-300">
            <p>
              The box includes the IoT device, wall-mount accessories, power
              adapter, and quick-start setup guide.
            </p>
            <p>
              The page is intentionally structured so stock availability,
              webhook-based fulfillment, shipping status, and installation
              services can be added later without redesigning the store.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StorePage;
