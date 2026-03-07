#!/usr/bin/env python3
"""
Split dataset images into train, validation, and test sets.

Expected folder structure:
  dataset/
    rice/
      healthy/
        img1.jpg
        img2.jpg
      leaf_blight/
        ...
    wheat/
      healthy/
      ...
    sugarcane/
      healthy/
      ...

Output structure:
  dataset/
    rice/
      train/
        healthy/
        leaf_blight/
      val/
        healthy/
        leaf_blight/
      test/
        healthy/
        leaf_blight/
    wheat/
      train/
      val/
      test/
    sugarcane/
      train/
      val/
      test/

Usage:
  python split_dataset.py [--dataset-dir DATASET_DIR] [--train 0.7] [--val 0.15] [--test 0.15] [--seed 42]
"""

import argparse
import os
import random
import shutil
from pathlib import Path


def split_dataset(
    dataset_dir: str = "dataset",
    train_ratio: float = 0.7,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> None:
    """Split images in dataset/rice, dataset/wheat, dataset/sugarcane into train/val/test."""
    if abs(train_ratio + val_ratio + test_ratio - 1.0) > 1e-6:
        raise ValueError("train + val + test ratios must sum to 1.0")

    random.seed(seed)
    dataset_path = Path(dataset_dir)
    crops = ["rice", "wheat", "sugarcane"]

    for crop in crops:
        crop_path = dataset_path / crop
        if not crop_path.exists():
            print(f"  [SKIP] {crop_path} not found")
            continue

        # Find class folders (e.g. healthy, leaf_blight) - exclude train/val/test if already split
        class_dirs = [
            d for d in crop_path.iterdir()
            if d.is_dir() and d.name not in ("train", "val", "test")
        ]

        if not class_dirs:
            print(f"  [SKIP] {crop_path} has no class subfolders")
            continue

        # Create output dirs
        for split in ("train", "val", "test"):
            (crop_path / split).mkdir(parents=True, exist_ok=True)

        for class_dir in class_dirs:
            class_name = class_dir.name
            images = list(class_dir.glob("*"))
            images = [f for f in images if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp", ".webp")]

            if not images:
                print(f"  [WARN] No images in {class_dir}")
                continue

            random.shuffle(images)
            n = len(images)
            n_train = int(n * train_ratio)
            n_val = int(n * val_ratio)
            n_test = n - n_train - n_val

            splits = {
                "train": images[:n_train],
                "val": images[n_train : n_train + n_val],
                "test": images[n_train + n_val :],
            }

            for split_name, files in splits.items():
                dest_dir = crop_path / split_name / class_name
                dest_dir.mkdir(parents=True, exist_ok=True)
                for f in files:
                    shutil.copy2(f, dest_dir / f.name)

            print(f"  [OK] {crop}/{class_name}: train={n_train}, val={n_val}, test={n_test}")

    print("Done. Images copied into train/val/test. Original class folders unchanged.")


def main():
    parser = argparse.ArgumentParser(description="Split crop images into train/val/test")
    parser.add_argument(
        "--dataset-dir",
        default="dataset",
        help="Path to dataset folder containing rice, wheat, sugarcane",
    )
    parser.add_argument("--train", type=float, default=0.7, help="Train ratio (default 0.7)")
    parser.add_argument("--val", type=float, default=0.15, help="Validation ratio (default 0.15)")
    parser.add_argument("--test", type=float, default=0.15, help="Test ratio (default 0.15)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    split_dataset(
        dataset_dir=args.dataset_dir,
        train_ratio=args.train,
        val_ratio=args.val,
        test_ratio=args.test,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()
