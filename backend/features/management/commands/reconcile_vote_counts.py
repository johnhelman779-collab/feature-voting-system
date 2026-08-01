from django.core.management.base import BaseCommand
from django.db.models import Count

from ...models import Feature


class Command(BaseCommand):
    help = "Set each Feature.vote_count from Vote row counts (repair drift)."

    def handle(self, *args, **options):
        mismatches = 0
        for feature in Feature.objects.annotate(actual=Count("votes")):
            if feature.vote_count != feature.actual:
                Feature.objects.filter(pk=feature.pk).update(vote_count=feature.actual)
                mismatches += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"Feature {feature.pk}: vote_count {feature.vote_count} -> {feature.actual}",
                    ),
                )
        if mismatches == 0:
            self.stdout.write(self.style.SUCCESS("All vote_count values match Vote rows."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated {mismatches} feature(s)."))
