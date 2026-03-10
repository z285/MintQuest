import { useMemo, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { create, mplCore } from "@metaplex-foundation/mpl-core";
import { generateSigner, createGenericFile } from "@metaplex-foundation/umi";
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
} from "@solana-mobile/wallet-adapter-mobile";
import "@solana/wallet-adapter-react-ui/styles.css";

const MintButton = () => {
  const wallet = useWallet();
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);

  const umi = useMemo(
    () =>
      createUmi(clusterApiUrl("mainnet-beta"))
        .use(mplCore())
        .use(walletAdapterIdentity(wallet))
        .use(irysUploader()),
    [wallet],
  );

  const generateAndMint = async () => {
    if (!wallet.publicKey || minting) return;

    setMinting(true);

    try {
      setStatus("Generating NFT image...");

      const canvas = document.createElement("canvas");
      canvas.width = 500;
      canvas.height = 500;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, 500, 500);

      ctx.fillStyle = "white";
      ctx.font = "28px monospace";
      ctx.textAlign = "center";

      const time = new Date().toLocaleString();
      ctx.fillText(time, 250, 250);

      const previewUrl = canvas.toDataURL();
      setPreview(previewUrl);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject("Canvas failed")));
      });

      const buffer = await blob.arrayBuffer();

      const file = createGenericFile(new Uint8Array(buffer), "nft.png", {
        contentType: "image/png",
      });

      setStatus("Uploading...");

      const [imageUri] = await umi.uploader.upload([file]);

      const metadataUri = await umi.uploader.uploadJson({
        name: "Time Stamp NFT",
        description: "Black square with time text",
        image: imageUri,
      });

      setStatus("Confirm transaction in wallet...");

      const asset = generateSigner(umi);

      await create(umi, {
        asset,
        name: "Timed Square",
        uri: metadataUri,
      }).sendAndConfirm(umi);

      setStatus(`Minted: ${asset.publicKey}`);
    } catch (error: any) {
      if (
        error?.message?.includes("rejected") ||
        error?.message?.includes("cancel") ||
        error?.name === "WalletSignTransactionError"
      ) {
        setStatus("Transaction cancelled.");
      } else {
        console.error(error);
        setStatus("Mint failed.");
      }
    } finally {
      setMinting(false);
    }
  };
  return (
    <div
      style={{
        background: "#111827",
        padding: "32px",
        borderRadius: "16px",
        width: "90%",
        maxWidth: "380px",
        textAlign: "center",
        boxShadow: "0 15px 40px rgba(0,0,0,0.6)",
        position: "relative",
      }}
    >
      <h2 style={{ color: "white", marginBottom: "10px" }}>Time Stamp NFT</h2>

      <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "20px" }}>
        Mint an NFT showing the exact time you created it.
      </p>

      {preview && (
        <img
          src={preview}
          style={{
            width: "220px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        />
      )}

      <div style={{ marginBottom: "20px" }}>
        <WalletMultiButton />
      </div>

      {wallet.connected && (
        <button
          onClick={generateAndMint}
          disabled={minting}
          style={{
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            border: "none",
            padding: "12px 20px",
            color: "white",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            width: "100%",
          }}
        >
          {minting ? "Processing..." : "Mint NFT"}
        </button>
      )}

      {status && (
        <p style={{ color: "#9ca3af", marginTop: "20px", fontSize: "13px" }}>
          {status}
        </p>
      )}

      <span
        style={{
          position: "absolute",
          bottom: "10px",
          right: "14px",
          fontSize: "10px",
          color: "#6b7280",
        }}
      >
        v1.0.0
      </span>
    </div>
  );
};

function App() {
  const wallets = useMemo(
    () => [
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        chain: "solana:mainnet",
        appIdentity: {
          name: "Time Stamp NFT",
        },
        onWalletNotFound: async () => {
          console.log("No mobile wallet installed");
        },
      }),
    ],
    [],
  );

  //const network = WalletAdapterNetwork.Devnet;
  const network = WalletAdapterNetwork.Mainnet;

  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "linear-gradient(135deg,#020617,#0f172a,#020617)",
            }}
          >
            <MintButton />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
